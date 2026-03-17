import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;

export const browserHistory = pgTable("browser_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  title: text("title").notNull(),
  favicon: text("favicon"),
  visitedAt: timestamp("visited_at").defaultNow().notNull(),
});

export const insertBrowserHistorySchema = createInsertSchema(browserHistory).omit({
  id: true,
  visitedAt: true,
});

export type InsertBrowserHistory = z.infer<typeof insertBrowserHistorySchema>;
export type BrowserHistory = typeof browserHistory.$inferSelect;

export const historyItems = pgTable("history_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  title: text("title").notNull(),
  visitedAt: timestamp("visited_at").defaultNow().notNull(),
});

export const insertHistoryItemSchema = createInsertSchema(historyItems).omit({
  id: true,
  visitedAt: true,
});

export type InsertHistoryItem = z.infer<typeof insertHistoryItemSchema>;
export type HistoryItem = typeof historyItems.$inferSelect;

export const searchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  description: z.string(),
  favicon: z.string().optional(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
