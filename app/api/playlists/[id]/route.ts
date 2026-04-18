import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, playlists, playlistItems, downloads, deletedVideos } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import fs from "fs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pl] = await db.select().from(playlists)
    .where(and(eq(playlists.id, params.id), eq(playlists.userId, session.user.id)));
  if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await db.select({
    id: playlistItems.id,
    order: playlistItems.order,
    download: downloads,
  })
    .from(playlistItems)
    .leftJoin(downloads, eq(playlistItems.downloadId, downloads.id))
    .where(eq(playlistItems.playlistId, params.id));

  return NextResponse.json({ ...pl, items });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isActive } = await req.json();

  const [pl] = await db.update(playlists)
    .set({ isActive })
    .where(and(eq(playlists.id, params.id), eq(playlists.userId, session.user.id)))
    .returning();

  if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pl);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleteFiles = req.nextUrl.searchParams.get("deleteFiles") === "1";

  if (deleteFiles) {
    // 이 플레이리스트에서 받은 다운로드 파일 + 레코드 삭제. 삭제 이력은 남기지 않음.
    const plDownloads = await db.select().from(downloads)
      .where(and(eq(downloads.playlistId, params.id), eq(downloads.userId, session.user.id)));
    for (const d of plDownloads) {
      if (d.filePath && fs.existsSync(d.filePath)) {
        try { fs.unlinkSync(d.filePath); } catch { /* ignore */ }
      }
    }
    await db.delete(downloads)
      .where(and(eq(downloads.playlistId, params.id), eq(downloads.userId, session.user.id)));
  }

  // 같은 플레이리스트 ID로 쌓인 삭제 이력 정리 — 재추가 시 다시 받을 수 있게.
  await db.delete(deletedVideos)
    .where(and(eq(deletedVideos.playlistId, params.id), eq(deletedVideos.userId, session.user.id)));

  await db.delete(playlists)
    .where(and(eq(playlists.id, params.id), eq(playlists.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
