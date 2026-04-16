import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { migrateDB } from "@/lib/db/migrate";
import { checkUserPlaylists } from "@/lib/playlist-worker";

/**
 * POST /api/playlists/check
 * 플레이리스트 체크 및 다운로드
 * body: { id?: string } - id가 있으면 해당 플레이리스트만, 없으면 전체
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await migrateDB();

    const { id } = await req.json().catch(() => ({}));

    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id));

    const result = await checkUserPlaylists(session.user.id, {
      userId: session.user.id,
      cookieContent: settings?.cookieContent,
      ytdlpArgs: settings?.ytdlpArgs,
      rateLimit: settings?.rateLimit,
      maxGlobalConcurrent: settings?.maxGlobalConcurrent,
      globalRateLimit: settings?.globalRateLimit,
    }, id ? { playlistId: id } : undefined);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[playlist-check] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
