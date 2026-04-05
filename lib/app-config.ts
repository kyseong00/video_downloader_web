import { db, appConfig } from "@/lib/db";
import { eq } from "drizzle-orm";
import { migrateDB } from "@/lib/db/migrate";

export const DEFAULT_SITE_NAME = "video_downloader";

export async function getSiteName(): Promise<string> {
  try {
    await migrateDB();
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, "siteName"));
    return row?.value || DEFAULT_SITE_NAME;
  } catch {
    return DEFAULT_SITE_NAME;
  }
}
