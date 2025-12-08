import { type User, type InsertUser, type HistoryItem, type InsertHistoryItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  addHistoryItem(item: InsertHistoryItem): Promise<HistoryItem>;
  getHistory(limit?: number): Promise<HistoryItem[]>;
  
  isIpAuthenticated(ip: string): boolean;
  authenticateIp(ip: string): void;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private history: HistoryItem[];
  private authenticatedIps: Set<string>;

  constructor() {
    this.users = new Map();
    this.history = [];
    this.authenticatedIps = new Set();
  }
  
  isIpAuthenticated(ip: string): boolean {
    return this.authenticatedIps.has(ip);
  }
  
  authenticateIp(ip: string): void {
    this.authenticatedIps.add(ip);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async addHistoryItem(insertItem: InsertHistoryItem): Promise<HistoryItem> {
    const id = randomUUID();
    const item: HistoryItem = {
      ...insertItem,
      id,
      visitedAt: new Date(),
    };
    this.history.unshift(item);
    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100);
    }
    return item;
  }

  async getHistory(limit: number = 50): Promise<HistoryItem[]> {
    return this.history.slice(0, limit);
  }
}

export const storage = new MemStorage();
