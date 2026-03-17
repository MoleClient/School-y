import {
  type User, type InsertUser,
  type HistoryItem, type InsertHistoryItem,
  type BrowserHistory, type InsertBrowserHistory,
  type UserSession,
  type ChatMessage, type InsertChatMessage,
  type MessageReaction,
  type Conversation, type ConversationMember,
  users, userSessions, browserHistory, historyItems, chatMessages, messageReactions,
  conversations, conversationMembers,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, ilike, ne, inArray, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;

class DatabaseStorage {
  // ─── Users ───────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const passwordHash = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const result = await db.insert(users).values({ ...insertUser, password: passwordHash }).returning();
    return result[0];
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async updateUserProfile(id: string, data: Partial<Pick<User, "displayName" | "avatarUrl" | "bio" | "socialTwitter" | "socialInstagram" | "socialDiscord">>): Promise<User> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async searchUsers(query: string, excludeUserId: string): Promise<Pick<User, "id" | "username" | "displayName" | "avatarUrl">[]> {
    if (!query || query.trim().length < 1) return [];
    const results = await db.select({
      id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl,
    }).from(users).where(and(ne(users.id, excludeUserId), ilike(users.username, `%${query}%`))).limit(10);
    return results;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  async createSession(userId: string): Promise<UserSession> {
    const token = randomUUID() + randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    const result = await db.insert(userSessions).values({ userId, token, expiresAt }).returning();
    return result[0];
  }

  async getSession(token: string): Promise<(UserSession & { user: User }) | undefined> {
    const now = new Date();
    const result = await db.select({
      id: userSessions.id, userId: userSessions.userId, token: userSessions.token,
      createdAt: userSessions.createdAt, expiresAt: userSessions.expiresAt, user: users,
    }).from(userSessions).innerJoin(users, eq(userSessions.userId, users.id))
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, now))).limit(1);
    return result[0];
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.token, token));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
  }

  // ─── Browser History ──────────────────────────────────────────────────────

  async addBrowserHistory(item: InsertBrowserHistory): Promise<BrowserHistory> {
    const result = await db.insert(browserHistory).values(item).returning();
    return result[0];
  }

  async getUserHistory(userId: string, limit: number = 200): Promise<BrowserHistory[]> {
    return db.select().from(browserHistory).where(eq(browserHistory.userId, userId))
      .orderBy(desc(browserHistory.visitedAt)).limit(limit);
  }

  async deleteUserHistory(userId: string): Promise<void> {
    await db.delete(browserHistory).where(eq(browserHistory.userId, userId));
  }

  async deleteHistoryItem(id: string, userId: string): Promise<void> {
    await db.delete(browserHistory).where(and(eq(browserHistory.id, id), eq(browserHistory.userId, userId)));
  }

  async addHistoryItem(insertItem: InsertHistoryItem): Promise<HistoryItem> {
    const result = await db.insert(historyItems).values(insertItem).returning();
    return result[0];
  }

  async getHistory(limit: number = 50): Promise<HistoryItem[]> {
    return db.select().from(historyItems).orderBy(desc(historyItems.visitedAt)).limit(limit);
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  async getOrCreateEveryoneConversation(): Promise<Conversation> {
    const existing = await db.select().from(conversations).where(eq(conversations.type, "everyone")).limit(1);
    if (existing[0]) return existing[0];
    const created = await db.insert(conversations).values({ name: "Everyone", type: "everyone" }).returning();
    return created[0];
  }

  async ensureUserInEveryone(userId: string): Promise<void> {
    const conv = await this.getOrCreateEveryoneConversation();
    const existing = await db.select().from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, conv.id), eq(conversationMembers.userId, userId))).limit(1);
    if (!existing[0]) {
      await db.insert(conversationMembers).values({ conversationId: conv.id, userId });
    }
  }

  async getUserConversations(userId: string): Promise<any[]> {
    const memberRows = await db.select().from(conversationMembers).where(eq(conversationMembers.userId, userId));
    if (memberRows.length === 0) return [];

    const convIds = memberRows.map(m => m.conversationId);
    const convs = await db.select().from(conversations).where(inArray(conversations.id, convIds));

    const result = [];
    for (const conv of convs) {
      const lastMsgRows = await db.select().from(chatMessages)
        .where(eq(chatMessages.conversationId, conv.id))
        .orderBy(desc(chatMessages.createdAt)).limit(1);

      const memberRows2 = await db.select({ user: users }).from(conversationMembers)
        .innerJoin(users, eq(conversationMembers.userId, users.id))
        .where(eq(conversationMembers.conversationId, conv.id));

      const members = memberRows2.map(m => ({
        id: m.user.id, username: m.user.username,
        displayName: m.user.displayName, avatarUrl: m.user.avatarUrl,
      }));

      let displayName = conv.name;
      let avatarUrl = conv.avatarUrl;

      if (conv.type === "dm") {
        const other = members.find(m => m.id !== userId);
        displayName = other?.displayName || other?.username || "Unknown";
        avatarUrl = other?.avatarUrl || null;
      }

      result.push({
        ...conv,
        displayName,
        avatarUrl,
        lastMessage: lastMsgRows[0] || null,
        members,
      });
    }

    result.sort((a, b) => {
      if (a.type === "everyone") return -1;
      if (b.type === "everyone") return 1;
      const aTime = a.lastMessage?.createdAt?.getTime() || a.createdAt.getTime();
      const bTime = b.lastMessage?.createdAt?.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });

    return result;
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async isConversationMember(conversationId: string, userId: string): Promise<boolean> {
    const result = await db.select().from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId))).limit(1);
    return !!result[0];
  }

  async getConversationMembers(conversationId: string): Promise<Pick<User, "id" | "username" | "displayName" | "avatarUrl">[]> {
    const rows = await db.select({ user: users }).from(conversationMembers)
      .innerJoin(users, eq(conversationMembers.userId, users.id))
      .where(eq(conversationMembers.conversationId, conversationId));
    return rows.map(r => ({ id: r.user.id, username: r.user.username, displayName: r.user.displayName, avatarUrl: r.user.avatarUrl }));
  }

  async getConversationMemberIds(conversationId: string): Promise<string[]> {
    const rows = await db.select({ userId: conversationMembers.userId }).from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId));
    return rows.map(r => r.userId);
  }

  async getDmConversation(userId1: string, userId2: string): Promise<Conversation | undefined> {
    const user1Rows = await db.select({ cid: conversationMembers.conversationId })
      .from(conversationMembers).where(eq(conversationMembers.userId, userId1));
    const user1Ids = user1Rows.map(r => r.cid);
    if (user1Ids.length === 0) return undefined;

    const user2Rows = await db.select({ cid: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(and(eq(conversationMembers.userId, userId2), inArray(conversationMembers.conversationId, user1Ids)));
    const sharedIds = user2Rows.map(r => r.cid);
    if (sharedIds.length === 0) return undefined;

    const result = await db.select().from(conversations)
      .where(and(eq(conversations.type, "dm"), inArray(conversations.id, sharedIds))).limit(1);
    return result[0];
  }

  async createDmConversation(userId1: string, userId2: string): Promise<Conversation> {
    const created = await db.insert(conversations).values({ type: "dm", createdBy: userId1 }).returning();
    const conv = created[0];
    await db.insert(conversationMembers).values([
      { conversationId: conv.id, userId: userId1 },
      { conversationId: conv.id, userId: userId2 },
    ]);
    return conv;
  }

  async createGroupConversation(name: string, creatorId: string, memberIds: string[]): Promise<Conversation> {
    const created = await db.insert(conversations).values({ name, type: "group", createdBy: creatorId }).returning();
    const conv = created[0];
    const allMembers = Array.from(new Set([creatorId, ...memberIds]));
    await db.insert(conversationMembers).values(allMembers.map(uid => ({ conversationId: conv.id, userId: uid })));
    return conv;
  }

  async addConversationMember(conversationId: string, userId: string): Promise<void> {
    const existing = await db.select().from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId))).limit(1);
    if (!existing[0]) {
      await db.insert(conversationMembers).values({ conversationId, userId });
    }
  }

  async updateConversationName(conversationId: string, name: string): Promise<void> {
    await db.update(conversations).set({ name }).where(eq(conversations.id, conversationId));
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  async getConversationMessages(conversationId: string): Promise<(ChatMessage & { user: Pick<User, "id" | "username" | "displayName" | "avatarUrl"> })[]> {
    const rows = await db.select({
      id: chatMessages.id,
      conversationId: chatMessages.conversationId,
      userId: chatMessages.userId,
      content: chatMessages.content,
      imageUrl: chatMessages.imageUrl,
      replyToId: chatMessages.replyToId,
      editedAt: chatMessages.editedAt,
      originalContent: chatMessages.originalContent,
      isSystem: chatMessages.isSystem,
      createdAt: chatMessages.createdAt,
      user: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
    }).from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt)
      .limit(200);
    return rows as any;
  }

  async createConversationMessage(data: {
    conversationId: string; userId: string; content: string;
    imageUrl?: string; replyToId?: string; isSystem?: boolean;
  }): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values({
      conversationId: data.conversationId,
      userId: data.userId,
      content: data.content,
      imageUrl: data.imageUrl,
      replyToId: data.replyToId,
      isSystem: data.isSystem || false,
    }).returning();
    return result[0];
  }

  async editChatMessage(id: string, userId: string, newContent: string): Promise<ChatMessage | undefined> {
    const existing = await db.select().from(chatMessages).where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId))).limit(1);
    if (!existing[0]) return undefined;
    const original = existing[0].originalContent || existing[0].content;
    const result = await db.update(chatMessages)
      .set({ content: newContent, editedAt: new Date(), originalContent: original })
      .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId))).returning();
    return result[0];
  }

  async deleteChatMessage(id: string, userId: string): Promise<void> {
    await db.delete(messageReactions).where(eq(messageReactions.messageId, id));
    await db.delete(chatMessages).where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)));
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    const result = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
    return result[0];
  }

  // Legacy methods kept for backward compatibility
  async getChatMessages(limit: number = 100): Promise<(ChatMessage & { user: Pick<User, "id" | "username" | "displayName" | "avatarUrl"> })[]> {
    return this.getConversationMessages("");
  }

  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(msg).returning();
    return result[0];
  }

  // ─── Reactions ────────────────────────────────────────────────────────────

  async getReactionsByMessage(messageId: string): Promise<MessageReaction[]> {
    return db.select().from(messageReactions).where(eq(messageReactions.messageId, messageId));
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const existing = await db.select().from(messageReactions)
      .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji))).limit(1);
    if (existing[0]) return existing[0];
    const result = await db.insert(messageReactions).values({ messageId, userId, emoji }).returning();
    return result[0];
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db.delete(messageReactions).where(
      and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji))
    );
  }

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction[]> {
    const existing = await db.select().from(messageReactions)
      .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji))).limit(1);
    if (existing[0]) {
      await db.delete(messageReactions).where(eq(messageReactions.id, existing[0].id));
    } else {
      await db.insert(messageReactions).values({ messageId, userId, emoji });
    }
    return db.select().from(messageReactions).where(eq(messageReactions.messageId, messageId));
  }
}

export const storage = new DatabaseStorage();
