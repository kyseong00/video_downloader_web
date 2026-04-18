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

  // subscriptions 신규 채널 최초 다운로드 개수 제한
  try { await db.run(sql`ALTER TABLE subscriptions ADD COLUMN initial_max_videos INTEGER NOT NULL DEFAULT 10`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE subscriptions ADD COLUMN first_check_done INTEGER NOT NULL DEFAULT 0`); } catch { /* ignore */ }
  // 기존 구독은 이미 초기 체크가 끝났다고 가정 (한 번에 재다운로드 폭주 방지)
  try { await db.run(sql`UPDATE subscriptions SET first_check_done = 1 WHERE first_check_done = 0`); } catch { /* ignore */ }

  // downloads 소스 구분 컬럼 — 신규 레코드만 채워짐. 기존 NULL은 "모든 소스 공통"으로 취급.
  try { await db.run(sql`ALTER TABLE downloads ADD COLUMN source TEXT`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE downloads ADD COLUMN subscription_id TEXT`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE downloads ADD COLUMN playlist_id TEXT`); } catch { /* ignore */ }

  // playlists도 동일 정책 적용
  try { await db.run(sql`ALTER TABLE playlists ADD COLUMN initial_max_videos INTEGER NOT NULL DEFAULT 10`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE playlists ADD COLUMN first_check_done INTEGER NOT NULL DEFAULT 0`); } catch { /* ignore */ }
  try { await db.run(sql`UPDATE playlists SET first_check_done = 1 WHERE first_check_done = 0`); } catch { /* ignore */ }

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
    source TEXT,
    subscription_id TEXT,
    playlist_id TEXT,
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
    initial_max_videos INTEGER NOT NULL DEFAULT 10,
    first_check_done INTEGER NOT NULL DEFAULT 0,
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
    initial_max_videos INTEGER NOT NULL DEFAULT 10,
    first_check_done INTEGER NOT NULL DEFAULT 0,
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

  await db.run(sql`CREATE TABLE IF NOT EXISTS deleted_videos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    video_id TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    subscription_id TEXT,
    playlist_id TEXT,
    deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  try { await db.run(sql`ALTER TABLE deleted_videos ADD COLUMN subscription_id TEXT`); } catch { /* ignore */ }
  try { await db.run(sql`ALTER TABLE deleted_videos ADD COLUMN playlist_id TEXT`); } catch { /* ignore */ }
  try { await db.run(sql`CREATE INDEX IF NOT EXISTS idx_deleted_videos_user_source ON deleted_videos (user_id, source, video_id)`); } catch { /* ignore */ }

  // v1.8.0 재추가 불가 버그 수정 — 삭제된 구독/플레이리스트에 묶인 삭제 이력/고아 다운로드 정리 (1회)
  try {
    const res = await db.run(sql`SELECT value FROM app_config WHERE key = 'orphanCleanupDone_v180' LIMIT 1`);
    const rows = (res as unknown as { rows?: unknown[] }).rows ?? [];
    if (rows.length === 0) {
      try { await db.run(sql`DELETE FROM deleted_videos WHERE source = 'PLAYLIST' AND (playlist_id IS NULL OR playlist_id NOT IN (SELECT id FROM playlists))`); } catch { /* ignore */ }
      try { await db.run(sql`DELETE FROM deleted_videos WHERE source = 'SUBSCRIPTION' AND (subscription_id IS NULL OR subscription_id NOT IN (SELECT id FROM subscriptions))`); } catch { /* ignore */ }
      try { await db.run(sql`DELETE FROM downloads WHERE source = 'PLAYLIST' AND playlist_id IS NOT NULL AND playlist_id NOT IN (SELECT id FROM playlists)`); } catch { /* ignore */ }
      try { await db.run(sql`DELETE FROM downloads WHERE source = 'SUBSCRIPTION' AND subscription_id IS NOT NULL AND subscription_id NOT IN (SELECT id FROM subscriptions)`); } catch { /* ignore */ }
      await db.run(sql`INSERT OR REPLACE INTO app_config (key, value) VALUES ('orphanCleanupDone_v180', '1')`);
    }
  } catch { /* ignore */ }

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
