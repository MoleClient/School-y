import {
  type User, type InsertUser,
  type HistoryItem, type InsertHistoryItem,
  type BrowserHistory, type InsertBrowserHistory,
  type UserSession,
  type ChatMessage, type InsertChatMessage,
  type MessageReaction,
  type Conversation, type ConversationMember,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;

export class MemStorage {
  private users = new Map<string, User>();
  private sessions = new Map<string, UserSession>();
  private browserHistoryItems = new Map<string, BrowserHistory>();
  private historyItems = new Map<string, HistoryItem>();
  private conversations = new Map<string, Conversation>();
  private conversationMembers = new Map<string, ConversationMember>();
  private chatMessages = new Map<string, ChatMessage>();
  private messageReactions = new Map<string, MessageReaction>();

  // ─── Users ───────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const u of this.users.values()) {
      if (u.username === username) return u;
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const passwordHash = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const user: User = {
      id: randomUUID(),
      username: insertUser.username,
      password: passwordHash,
      displayName: null,
      avatarUrl: null,
      bio: null,
      socialTwitter: null,
      socialInstagram: null,
      socialDiscord: null,
      createdAt: new Date(),
      timedOutUntil: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async updateUserProfile(id: string, data: Partial<Pick<User, "displayName" | "avatarUrl" | "bio" | "socialTwitter" | "socialInstagram" | "socialDiscord">>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async searchUsers(query: string, excludeUserId: string): Promise<Pick<User, "id" | "username" | "displayName" | "avatarUrl">[]> {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase();
    return [...this.users.values()]
      .filter(u => u.id !== excludeUserId && u.username.toLowerCase().includes(q))
      .slice(0, 10)
      .map(u => ({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl }));
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users.values()];
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  async createSession(userId: string): Promise<UserSession> {
    const session: UserSession = {
      id: randomUUID(),
      userId,
      token: randomUUID() + randomUUID(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    };
    this.sessions.set(session.token, session);
    return session;
  }

  async getSession(token: string): Promise<(UserSession & { user: User }) | undefined> {
    const session = this.sessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return undefined;
    }
    const user = this.users.get(session.userId);
    if (!user) return undefined;
    return { ...session, user };
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    for (const [token, session] of this.sessions) {
      if (session.userId === userId) this.sessions.delete(token);
    }
  }

  // ─── Browser History ──────────────────────────────────────────────────────

  async addBrowserHistory(item: InsertBrowserHistory): Promise<BrowserHistory> {
    const entry: BrowserHistory = {
      id: randomUUID(),
      userId: item.userId,
      url: item.url,
      title: item.title,
      favicon: item.favicon ?? null,
      visitedAt: new Date(),
    };
    this.browserHistoryItems.set(entry.id, entry);
    return entry;
  }

  async getUserHistory(userId: string, limit = 200): Promise<BrowserHistory[]> {
    return [...this.browserHistoryItems.values()]
      .filter(h => h.userId === userId)
      .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())
      .slice(0, limit);
  }

  async deleteUserHistory(userId: string): Promise<void> {
    for (const [id, h] of this.browserHistoryItems) {
      if (h.userId === userId) this.browserHistoryItems.delete(id);
    }
  }

  async deleteHistoryItem(id: string, userId: string): Promise<void> {
    const h = this.browserHistoryItems.get(id);
    if (h && h.userId === userId) this.browserHistoryItems.delete(id);
  }

  async addHistoryItem(insertItem: InsertHistoryItem): Promise<HistoryItem> {
    const item: HistoryItem = {
      id: randomUUID(),
      url: insertItem.url,
      title: insertItem.title,
      visitedAt: new Date(),
    };
    this.historyItems.set(item.id, item);
    return item;
  }

  async getHistory(limit = 50): Promise<HistoryItem[]> {
    return [...this.historyItems.values()]
      .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())
      .slice(0, limit);
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  async getOrCreateEveryoneConversation(): Promise<Conversation> {
    for (const c of this.conversations.values()) {
      if (c.type === "everyone") return c;
    }
    const conv: Conversation = {
      id: randomUUID(),
      name: "Everyone",
      type: "everyone",
      createdBy: null,
      avatarUrl: null,
      createdAt: new Date(),
    };
    this.conversations.set(conv.id, conv);
    return conv;
  }

  async ensureUserInEveryone(userId: string): Promise<void> {
    const conv = await this.getOrCreateEveryoneConversation();
    const already = [...this.conversationMembers.values()]
      .some(m => m.conversationId === conv.id && m.userId === userId);
    if (!already) {
      const m: ConversationMember = {
        id: randomUUID(),
        conversationId: conv.id,
        userId,
        joinedAt: new Date(),
      };
      this.conversationMembers.set(m.id, m);
    }
  }

  async getUserConversations(userId: string): Promise<any[]> {
    const memberConvIds = new Set(
      [...this.conversationMembers.values()]
        .filter(m => m.userId === userId)
        .map(m => m.conversationId)
    );

    const result: any[] = [];
    for (const convId of memberConvIds) {
      const conv = this.conversations.get(convId);
      if (!conv) continue;

      const lastMsg = [...this.chatMessages.values()]
        .filter(m => m.conversationId === convId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null;

      const members = [...this.conversationMembers.values()]
        .filter(m => m.conversationId === convId)
        .map(m => {
          const u = this.users.get(m.userId);
          return u ? { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl } : null;
        })
        .filter(Boolean) as any[];

      let displayName = conv.name;
      let avatarUrl = conv.avatarUrl;

      if (conv.type === "dm") {
        const other = members.find(m => m.id !== userId);
        displayName = other?.displayName || other?.username || "Unknown";
        avatarUrl = other?.avatarUrl || null;
      }

      result.push({ ...conv, displayName, avatarUrl, lastMessage: lastMsg, members });
    }

    return result.sort((a, b) => {
      if (a.type === "everyone") return -1;
      if (b.type === "everyone") return 1;
      const at = a.lastMessage?.createdAt?.getTime() || a.createdAt.getTime();
      const bt = b.lastMessage?.createdAt?.getTime() || b.createdAt.getTime();
      return bt - at;
    });
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async isConversationMember(conversationId: string, userId: string): Promise<boolean> {
    return [...this.conversationMembers.values()]
      .some(m => m.conversationId === conversationId && m.userId === userId);
  }

  async getConversationMembers(conversationId: string): Promise<Pick<User, "id" | "username" | "displayName" | "avatarUrl">[]> {
    return [...this.conversationMembers.values()]
      .filter(m => m.conversationId === conversationId)
      .map(m => {
        const u = this.users.get(m.userId);
        return u ? { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl } : null;
      })
      .filter(Boolean) as any[];
  }

  async getConversationMemberIds(conversationId: string): Promise<string[]> {
    return [...this.conversationMembers.values()]
      .filter(m => m.conversationId === conversationId)
      .map(m => m.userId);
  }

  async getDmConversation(userId1: string, userId2: string): Promise<Conversation | undefined> {
    const u1Convs = new Set(
      [...this.conversationMembers.values()]
        .filter(m => m.userId === userId1)
        .map(m => m.conversationId)
    );
    const sharedConvIds = [...this.conversationMembers.values()]
      .filter(m => m.userId === userId2 && u1Convs.has(m.conversationId))
      .map(m => m.conversationId);

    for (const cid of sharedConvIds) {
      const conv = this.conversations.get(cid);
      if (conv?.type === "dm") return conv;
    }
    return undefined;
  }

  async createDmConversation(userId1: string, userId2: string): Promise<Conversation> {
    const conv: Conversation = {
      id: randomUUID(),
      name: null,
      type: "dm",
      createdBy: userId1,
      avatarUrl: null,
      createdAt: new Date(),
    };
    this.conversations.set(conv.id, conv);
    for (const uid of [userId1, userId2]) {
      const m: ConversationMember = { id: randomUUID(), conversationId: conv.id, userId: uid, joinedAt: new Date() };
      this.conversationMembers.set(m.id, m);
    }
    return conv;
  }

  async createGroupConversation(name: string, creatorId: string, memberIds: string[]): Promise<Conversation> {
    const conv: Conversation = {
      id: randomUUID(),
      name,
      type: "group",
      createdBy: creatorId,
      avatarUrl: null,
      createdAt: new Date(),
    };
    this.conversations.set(conv.id, conv);
    const allMembers = Array.from(new Set([creatorId, ...memberIds]));
    for (const uid of allMembers) {
      const m: ConversationMember = { id: randomUUID(), conversationId: conv.id, userId: uid, joinedAt: new Date() };
      this.conversationMembers.set(m.id, m);
    }
    return conv;
  }

  async addConversationMember(conversationId: string, userId: string): Promise<void> {
    const already = [...this.conversationMembers.values()]
      .some(m => m.conversationId === conversationId && m.userId === userId);
    if (!already) {
      const m: ConversationMember = { id: randomUUID(), conversationId, userId, joinedAt: new Date() };
      this.conversationMembers.set(m.id, m);
    }
  }

  async updateConversationName(conversationId: string, name: string): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (conv) this.conversations.set(conversationId, { ...conv, name });
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  async getConversationMessages(conversationId: string): Promise<(ChatMessage & { user: Pick<User, "id" | "username" | "displayName" | "avatarUrl"> })[]> {
    return [...this.chatMessages.values()]
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-200)
      .map(m => {
        const u = this.users.get(m.userId)!;
        return { ...m, user: { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl } };
      });
  }

  async createConversationMessage(data: {
    conversationId: string; userId: string; content: string;
    imageUrl?: string; replyToId?: string; isSystem?: boolean;
  }): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: randomUUID(),
      conversationId: data.conversationId,
      userId: data.userId,
      content: data.content,
      imageUrl: data.imageUrl ?? null,
      replyToId: data.replyToId ?? null,
      editedAt: null,
      originalContent: null,
      isSystem: data.isSystem ?? false,
      createdAt: new Date(),
    };
    this.chatMessages.set(msg.id, msg);
    return msg;
  }

  async editChatMessage(id: string, userId: string, newContent: string): Promise<ChatMessage | undefined> {
    const msg = this.chatMessages.get(id);
    if (!msg || msg.userId !== userId) return undefined;
    const updated = {
      ...msg,
      content: newContent,
      editedAt: new Date(),
      originalContent: msg.originalContent ?? msg.content,
    };
    this.chatMessages.set(id, updated);
    return updated;
  }

  async moderateMessage(id: string, cleanedContent: string): Promise<void> {
    const msg = this.chatMessages.get(id);
    if (msg) this.chatMessages.set(id, { ...msg, content: cleanedContent });
  }

  async deleteChatMessage(id: string, userId: string): Promise<void> {
    const msg = this.chatMessages.get(id);
    if (msg && msg.userId === userId) {
      for (const [rid, r] of this.messageReactions) {
        if (r.messageId === id) this.messageReactions.delete(rid);
      }
      this.chatMessages.delete(id);
    }
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    return this.chatMessages.get(id);
  }

  async getChatMessages(limit = 100): Promise<(ChatMessage & { user: Pick<User, "id" | "username" | "displayName" | "avatarUrl"> })[]> {
    return this.getConversationMessages("");
  }

  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    return this.createConversationMessage(msg as any);
  }

  // ─── Reactions ────────────────────────────────────────────────────────────

  async getReactionsByMessage(messageId: string): Promise<MessageReaction[]> {
    return [...this.messageReactions.values()].filter(r => r.messageId === messageId);
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const existing = [...this.messageReactions.values()]
      .find(r => r.messageId === messageId && r.userId === userId && r.emoji === emoji);
    if (existing) return existing;
    const r: MessageReaction = { id: randomUUID(), messageId, userId, emoji, createdAt: new Date() };
    this.messageReactions.set(r.id, r);
    return r;
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    for (const [id, r] of this.messageReactions) {
      if (r.messageId === messageId && r.userId === userId && r.emoji === emoji) {
        this.messageReactions.delete(id);
      }
    }
  }

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction[]> {
    const existing = [...this.messageReactions.values()]
      .find(r => r.messageId === messageId && r.userId === userId && r.emoji === emoji);
    if (existing) {
      this.messageReactions.delete(existing.id);
    } else {
      const r: MessageReaction = { id: randomUUID(), messageId, userId, emoji, createdAt: new Date() };
      this.messageReactions.set(r.id, r);
    }
    return [...this.messageReactions.values()].filter(r => r.messageId === messageId);
  }
}
