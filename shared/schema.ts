import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  socialTwitter: text("social_twitter"),
  socialInstagram: text("social_instagram"),
  socialDiscord: text("social_discord"),
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

// Conversations (everyone, dm, group)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  type: text("type").notNull().default("dm"), // "everyone" | "dm" | "group"
  createdBy: varchar("created_by").references(() => users.id),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;

export const conversationMembers = pgTable("conversation_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export type ConversationMember = typeof conversationMembers.$inferSelect;

// Chat messages (now belong to a conversation)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  replyToId: varchar("reply_to_id"),
  editedAt: timestamp("edited_at"),
  originalContent: text("original_content"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  editedAt: true,
  originalContent: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const messageReactions = pgTable("message_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => chatMessages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MessageReaction = typeof messageReactions.$inferSelect;

export const searchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  description: z.string(),
  favicon: z.string().optional(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
