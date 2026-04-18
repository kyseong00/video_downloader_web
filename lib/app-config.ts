import { db, appConfig } from "@/lib/db";
import { eq } from "drizzle-orm";
import { migrateDB } from "@/lib/db/migrate";

export const DEFAULT_SITE_NAME = "video_downloader";
export const DEFAULT_INITIAL_MAX_VIDEOS = 10;

export async function getSiteName(): Promise<string> {
  try {
    await migrateDB();
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, "siteName"));
    return row?.value || DEFAULT_SITE_NAME;
  } catch {
    return DEFAULT_SITE_NAME;
  }
}

export async function getDefaultInitialMaxVideos(): Promise<number> {
  try {
    await migrateDB();
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, "defaultInitialMaxVideos"));
    if (!row?.value) return DEFAULT_INITIAL_MAX_VIDEOS;
    const n = Number(row.value);
    if (!Number.isFinite(n) || n < 0) return DEFAULT_INITIAL_MAX_VIDEOS;
    return Math.min(500, Math.max(0, Math.floor(n)));
  } catch {
    return DEFAULT_INITIAL_MAX_VIDEOS;
  }
}
