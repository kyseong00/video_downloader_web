import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, playlists } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { migrateDB } from "@/lib/db/migrate";
import { getDefaultInitialMaxVideos } from "@/lib/app-config";
import type { InferInsertModel } from "drizzle-orm";

type NewPlaylist = InferInsertModel<typeof playlists>;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await migrateDB();
  const pls = await db.select().from(playlists).where(eq(playlists.userId, session.user.id));
  return NextResponse.json(pls);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN";

  const body = await req.json();
  const { name, playlistUrl, format = "mp4", quality = "best" } = body;
  if (!name) return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });
  if (!playlistUrl) return NextResponse.json({ error: "플레이리스트 URL이 필요합니다." }, { status: 400 });

  await migrateDB();

  let initialMaxVideos = await getDefaultInitialMaxVideos();
  if (isAdmin && body.initialMaxVideos !== undefined) {
    const n = Number(body.initialMaxVideos);
    if (Number.isFinite(n) && n >= 0) {
      initialMaxVideos = Math.min(500, Math.max(0, Math.floor(n)));
    }
  }

  const newPlaylist: NewPlaylist = {
    id: generateId(),
    name: name as string,
    playlistUrl: playlistUrl as string,
    format: format as string,
    quality: quality as string,
    initialMaxVideos,
    userId: session.user.id,
  };

  const [pl] = await db.insert(playlists).values(newPlaylist).returning();

  return NextResponse.json(pl, { status: 201 });
}
