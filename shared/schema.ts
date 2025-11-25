import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
