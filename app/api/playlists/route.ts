import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, playlists, playlistItems, downloads } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { migrateDB } from "@/lib/db/migrate";

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

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });

  await migrateDB();
  const [pl] = await db.insert(playlists).values({
    id: generateId(),
    name,
    userId: session.user.id,
  }).returning();

  return NextResponse.json(pl, { status: 201 });
}
