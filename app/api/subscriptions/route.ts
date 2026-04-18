import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, subscriptions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { getChannelInfo } from "@/lib/ytdlp";
import { migrateDB } from "@/lib/db/migrate";
import { getDefaultInitialMaxVideos } from "@/lib/app-config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await migrateDB();
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, session.user.id));
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN";

  const body = await req.json();
  const { url, format = "mp4", quality = "best" } = body;
  if (!url) return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });

  await migrateDB();

  // 관리자만 initialMaxVideos 직접 지정 가능, 일반 사용자는 전역 기본값 사용
  let initialMaxVideos = await getDefaultInitialMaxVideos();
  if (isAdmin && body.initialMaxVideos !== undefined) {
    const n = Number(body.initialMaxVideos);
    if (Number.isFinite(n) && n >= 0) {
      initialMaxVideos = Math.min(500, Math.max(0, Math.floor(n)));
    }
  }

  try {
    const info = await getChannelInfo(url);
    const [sub] = await db.insert(subscriptions).values({
      id: generateId(),
      channelId: info.id,
      channelName: info.channel,
      channelThumb: info.thumbnail,
      channelUrl: info.channel_url,
      format,
      quality,
      initialMaxVideos,
      userId: session.user.id,
    }).returning();
    return NextResponse.json(sub, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
