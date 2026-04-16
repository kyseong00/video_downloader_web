import { db } from "./index";
import { sql } from "drizzle-orm";

export async function migrateDB() {
  await db.run(sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  // 기존 DB에 status 컬럼 없으면 추가 (마이그레이션)
  try {
    await db.run(sql`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'`);
    // 기존 유저는 모두 APPROVED 처리
    await db.run(sql`UPDATE users SET status = 'APPROVED' WHERE status = 'PENDING'`);
  } catch { /* 이미 존재하면 무시 */ }

  // locale 컬럼 마이그레이션
  try { await db.run(sql`ALTER TABLE users ADD COLUMN locale TEXT`); } catch { /* ignore */ }

  // must_change_password 컬럼 마이그레이션
  try { await db.run(sql`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`); } catch { /* ignore */ }

  // downloads width/height 컬럼 마이그레이션
  try { await db.run(sql`ALTER TABLE downloads ADD COLUMN width INTEGER`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE downloads ADD COLUMN height INTEGER`); } catch { /* ignore */ }

  // speed/eta 컬럼 마이그레이션
  try { await db.run(sql`ALTER TABLE downloads ADD COLUMN speed TEXT`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE downloads ADD COLUMN eta TEXT`); } catch { /* ignore */ }

  // user_settings 신규 컬럼 마이그레이션
  try { await db.run(sql`ALTER TABLE user_settings ADD COLUMN ytdlp_args TEXT NOT NULL DEFAULT ''`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE user_settings ADD COLUMN rate_limit TEXT NOT NULL DEFAULT ''`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE user_settings ADD COLUMN cookie_content TEXT NOT NULL DEFAULT ''`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE user_settings ADD COLUMN last_auto_checked TEXT`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE user_settings ADD COLUMN global_rate_limit TEXT NOT NULL DEFAULT ''`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE user_settings ADD COLUMN max_global_concurrent INTEGER NOT NULL DEFAULT 3`); } catch { /* ignore */ }

  await db.run(sql`CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    thumbnail TEXT,
    file_path TEXT,
    file_size INTEGER,
    duration INTEGER,
    width INTEGER,
    height INTEGER,
    format TEXT NOT NULL DEFAULT 'mp4',
    quality TEXT NOT NULL DEFAULT 'best',
    status TEXT NOT NULL DEFAULT 'PENDING',
    progress REAL NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'VIDEO',
    speed TEXT,
    eta TEXT,
    error TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_thumb TEXT,
    channel_url TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    format TEXT NOT NULL DEFAULT 'mp4',
    quality TEXT NOT NULL DEFAULT 'best',
    last_checked TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, channel_id)
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    playlist_url TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL DEFAULT 'mp4',
    quality TEXT NOT NULL DEFAULT 'best',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_checked TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  // playlists 테이블 마이그레이션
  try { await db.run(sql`ALTER TABLE playlists ADD COLUMN playlist_url TEXT NOT NULL DEFAULT ''`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE playlists ADD COLUMN format TEXT NOT NULL DEFAULT 'mp4'`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE playlists ADD COLUMN quality TEXT NOT NULL DEFAULT 'best'`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE playlists ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE playlists ADD COLUMN last_checked TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`); } catch { /* ignore */ }

  await db.run(sql`CREATE TABLE IF NOT EXISTS playlist_items (
    id TEXT PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    download_id TEXT NOT NULL REFERENCES downloads(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, download_id)
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    download_path TEXT NOT NULL DEFAULT './public/downloads',
    max_concurrent INTEGER NOT NULL DEFAULT 3,
    default_format TEXT NOT NULL DEFAULT 'mp4',
    default_quality TEXT NOT NULL DEFAULT 'best',
    poll_interval INTEGER NOT NULL DEFAULT 3600,
    ytdlp_args TEXT NOT NULL DEFAULT '',
    rate_limit TEXT NOT NULL DEFAULT '',
    cookie_content TEXT NOT NULL DEFAULT '',
    last_auto_checked TEXT,
    global_rate_limit TEXT NOT NULL DEFAULT '',
    max_global_concurrent INTEGER NOT NULL DEFAULT 3,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
  )`);
}
