import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, subscriptions } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { getChannelInfo } from "@/lib/ytdlp";
import { migrateDB } from "@/lib/db/migrate";

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

  const { url, format = "mp4", quality = "best" } = await req.json();
  if (!url) return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });

  await migrateDB();

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
      userId: session.user.id,
    }).returning();
    return NextResponse.json(sub, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
