import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, playlists, playlistItems, downloads } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";

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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.delete(playlists)
    .where(and(eq(playlists.id, params.id), eq(playlists.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
