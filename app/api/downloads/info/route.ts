import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getVideoInfo } from "@/lib/ytdlp";
import { migrateDB } from "@/lib/db/migrate";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });

  try {
    await migrateDB();
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id));
    const cookieContent = settings?.cookieContent || "";

    const info = await getVideoInfo(url, cookieContent || undefined);
    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
