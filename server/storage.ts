import {
  type User, type InsertUser,
  type HistoryItem, type InsertHistoryItem,
  type BrowserHistory, type InsertBrowserHistory,
  type UserSession,
  type ChatMessage, type InsertChatMessage,
  type MessageReaction,
  users, userSessions, browserHistory, historyItems, chatMessages, messageReactions,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(plain: string, hash: string): Promise<boolean>;
  updateUserProfile(id: string, data: Partial<Pick<User, "displayName" | "avatarUrl" | "bio" | "socialTwitter" | "socialInstagram" | "socialDiscord">>): Promise<User>;

  createSession(userId: string): Promise<UserSession>;
  getSession(token: string): Promise<(UserSession & { user: User }) | undefined>;
  deleteSession(token: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;

  addBrowserHistory(item: InsertBrowserHistory): Promise<BrowserHistory>;
  getUserHistory(userId: string, limit?: number): Promise<BrowserHistory[]>;
  deleteUserHistory(userId: string): Promise<void>;
  deleteHistoryItem(id: string, userId: string): Promise<void>;

  addHistoryItem(item: InsertHistoryItem): Promise<HistoryItem>;
  getHistory(limit?: number): Promise<HistoryItem[]>;

  // Chat messages
  getChatMessages(limit?: number): Promise<(ChatMessage & { user: Pick<User, "id" | "username" | "displayName" | "avatarUrl"> })[]>;
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  editChatMessage(id: string, userId: string, newContent: string): Promise<ChatMessage | undefined>;
  deleteChatMessage(id: string, userId: string): Promise<void>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;

  // Reactions
  getReactionsByMessage(messageId: string): Promise<MessageReaction[]>;
  addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction>;
  removeReaction(messageId: string, userId: string, emoji: string): Promise<void>;

  isIpAuthenticated(ip: string): boolean;
  authenticateIp(ip: string): void;
}

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;

class DatabaseStorage implements IStorage {
  private authenticatedIps: Set<string> = new Set();

  isIpAuthenticated(ip: string): boolean {
    return this.authenticatedIps.has(ip);
  }

  authenticateIp(ip: string): void {
    this.authenticatedIps.add(ip);
  }

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
    const result = await db.insert(users).values({
      ...insertUser,
      password: passwordHash,
    }).returning();
    return result[0];
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async updateUserProfile(id: string, data: Partial<Pick<User, "displayName" | "avatarUrl" | "bio" | "socialTwitter" | "socialInstagram" | "socialDiscord">>): Promise<User> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async createSession(userId: string): Promise<UserSession> {
    const token = randomUUID() + randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    const result = await db.insert(userSessions).values({ userId, token, expiresAt }).returning();
    return result[0];
  }

  async getSession(token: string): Promise<(UserSession & { user: User }) | undefined> {
    const now = new Date();
    const result = await db
      .select({
        id: userSessions.id,
        userId: userSessions.userId,
        token: userSessions.token,
        createdAt: userSessions.createdAt,
        expiresAt: userSessions.expiresAt,
        user: users,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, now)))
      .limit(1);
    return result[0];
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.token, token));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
  }

  async addBrowserHistory(item: InsertBrowserHistory): Promise<BrowserHistory> {
    const result = await db.insert(browserHistory).values(item).returning();
    return result[0];
  }

  async getUserHistory(userId: string, limit: number = 200): Promise<BrowserHistory[]> {
    return db
      .select()
      .from(browserHistory)
      .where(eq(browserHistory.userId, userId))
      .orderBy(desc(browserHistory.visitedAt))
      .limit(limit);
  }

  async deleteUserHistory(userId: string): Promise<void> {
    await db.delete(browserHistory).where(eq(browserHistory.userId, userId));
  }

  async deleteHistoryItem(id: string, userId: string): Promise<void> {
    await db.delete(browserHistory).where(
      and(eq(browserHistory.id, id), eq(browserHistory.userId, userId))
    );
  }

  async addHistoryItem(insertItem: InsertHistoryItem): Promise<HistoryItem> {
    const result = await db.insert(historyItems).values(insertItem).returning();
    return result[0];
  }

  async getHistory(limit: number = 50): Promise<HistoryItem[]> {
    return db.select().from(historyItems).orderBy(desc(historyItems.visitedAt)).limit(limit);
  }

  async getChatMessages(limit: number = 100): Promise<(ChatMessage & { user: Pick<User, "id" | "username" | "displayName" | "avatarUrl"> })[]> {
    const rows = await db
      .select({
        id: chatMessages.id,
        userId: chatMessages.userId,
        content: chatMessages.content,
        imageUrl: chatMessages.imageUrl,
        replyToId: chatMessages.replyToId,
        editedAt: chatMessages.editedAt,
        originalContent: chatMessages.originalContent,
        createdAt: chatMessages.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(msg).returning();
    return result[0];
  }

  async editChatMessage(id: string, userId: string, newContent: string): Promise<ChatMessage | undefined> {
    const existing = await db.select().from(chatMessages).where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId))).limit(1);
    if (!existing[0]) return undefined;
    const original = existing[0].originalContent || existing[0].content;
    const result = await db
      .update(chatMessages)
      .set({ content: newContent, editedAt: new Date(), originalContent: original })
      .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)))
      .returning();
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

  async getReactionsByMessage(messageId: string): Promise<MessageReaction[]> {
    return db.select().from(messageReactions).where(eq(messageReactions.messageId, messageId));
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const existing = await db.select().from(messageReactions).where(
      and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji))
    ).limit(1);
    if (existing[0]) return existing[0];
    const result = await db.insert(messageReactions).values({ messageId, userId, emoji }).returning();
    return result[0];
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db.delete(messageReactions).where(
      and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji))
    );
  }
}

export const storage = new DatabaseStorage();
