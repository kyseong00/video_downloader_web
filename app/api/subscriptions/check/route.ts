import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { migrateDB } from "@/lib/db/migrate";
import { checkUserSubscriptions } from "@/lib/subscription-worker";

/**
 * POST /api/subscriptions/check
 * 즉시 응답 후 백그라운드에서 구독 체크 실행
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await migrateDB();

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id));

  // 즉시 응답 반환 - 백그라운드에서 체크 실행
  const userId = session.user.id;
  setImmediate(() => {
    checkUserSubscriptions(userId, {
      userId,
      cookieContent: settings?.cookieContent || "",
      ytdlpArgs: settings?.ytdlpArgs || "",
      rateLimit: settings?.rateLimit || "",
      maxGlobalConcurrent: settings?.maxGlobalConcurrent ?? 3,
      globalRateLimit: settings?.globalRateLimit || "",
    }, { fetchAll: true }).catch(err => {
      console.error("[subscription-check] error:", err);
    });
  });

  return NextResponse.json({ status: "started", message: "백그라운드에서 체크 중입니다" });
}
