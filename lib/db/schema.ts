import { sql } from "drizzle-orm";
import { text, integer, real, sqliteTable } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["ADMIN", "USER"] }).notNull().default("USER"),
  status: text("status", { enum: ["PENDING", "APPROVED"] }).notNull().default("PENDING"),
  locale: text("locale"),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const downloads = sqliteTable("downloads", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull().default(""),
  thumbnail: text("thumbnail"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  duration: integer("duration"),
  width: integer("width"),
  height: integer("height"),
  format: text("format").notNull().default("mp4"),
  quality: text("quality").notNull().default("best"),
  status: text("status", { enum: ["PENDING", "DOWNLOADING", "PROCESSING", "DONE", "ERROR"] }).notNull().default("PENDING"),
  progress: real("progress").notNull().default(0),
  type: text("type", { enum: ["VIDEO", "AUDIO"] }).notNull().default("VIDEO"),
  speed: text("speed"),
  eta: text("eta"),
  error: text("error"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(),
  channelThumb: text("channel_thumb"),
  channelUrl: text("channel_url").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  format: text("format").notNull().default("mp4"),
  quality: text("quality").notNull().default("best"),
  lastChecked: text("last_checked").notNull().default(sql`CURRENT_TIMESTAMP`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const playlists = sqliteTable("playlists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const playlistItems = sqliteTable("playlist_items", {
  id: text("id").primaryKey(),
  order: integer("order").notNull().default(0),
  playlistId: text("playlist_id").notNull().references(() => playlists.id, { onDelete: "cascade" }),
  downloadId: text("download_id").notNull().references(() => downloads.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userSettings = sqliteTable("user_settings", {
  id: text("id").primaryKey(),
  downloadPath: text("download_path").notNull().default("./public/downloads"),
  maxConcurrent: integer("max_concurrent").notNull().default(3),
  defaultFormat: text("default_format").notNull().default("mp4"),
  defaultQuality: text("default_quality").notNull().default("best"),
  pollInterval: integer("poll_interval").notNull().default(3600),
  ytdlpArgs: text("ytdlp_args").notNull().default(""),
  rateLimit: text("rate_limit").notNull().default(""),
  cookieContent: text("cookie_content").notNull().default(""),
  lastAutoChecked: text("last_auto_checked"),
  globalRateLimit: text("global_rate_limit").notNull().default(""),
  maxGlobalConcurrent: integer("max_global_concurrent").notNull().default(3),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
});

export const appConfig = sqliteTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});
