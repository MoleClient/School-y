import {
  type User, type InsertUser,
  type HistoryItem, type InsertHistoryItem,
  type BrowserHistory, type InsertBrowserHistory,
  type UserSession,
  users, userSessions, browserHistory, historyItems,
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
}

export const storage = new DatabaseStorage();
