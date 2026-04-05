import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, playlists, playlistItems } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pl] = await db.select().from(playlists)
    .where(and(eq(playlists.id, params.id), eq(playlists.userId, session.user.id)));
  if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { downloadId, order = 0 } = await req.json();

  const [item] = await db.insert(playlistItems).values({
    id: generateId(),
    playlistId: params.id,
    downloadId,
    order,
  }).returning();

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { downloadId } = await req.json();
  await db.delete(playlistItems)
    .where(and(eq(playlistItems.playlistId, params.id), eq(playlistItems.downloadId, downloadId)));

  return NextResponse.json({ success: true });
}
