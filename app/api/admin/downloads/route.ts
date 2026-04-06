import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, downloads, users } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { desc } from "drizzle-orm";
import fs from "fs";
import { activeDownloads } from "@/lib/active-downloads";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

// GET /api/admin/downloads?userId=xxx — 특정 사용자 또는 전체 다운로드 목록
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const query = db
    .select({
      id: downloads.id,
      url: downloads.url,
      title: downloads.title,
      thumbnail: downloads.thumbnail,
      filePath: downloads.filePath,
      fileSize: downloads.fileSize,
      duration: downloads.duration,
      format: downloads.format,
      quality: downloads.quality,
      status: downloads.status,
      type: downloads.type,
      error: downloads.error,
      userId: downloads.userId,
      createdAt: downloads.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(downloads)
    .leftJoin(users, eq(downloads.userId, users.id))
    .orderBy(desc(downloads.createdAt));

  const result = userId
    ? await query.where(eq(downloads.userId, userId))
    : await query;

  return NextResponse.json(result);
}

// DELETE /api/admin/downloads — 다운로드 삭제 (단일 또는 복수)
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean);
  if (!ids || ids.length === 0) return NextResponse.json({ error: "ids 필요" }, { status: 400 });

  // 삭제할 다운로드 조회
  const toDelete = await db
    .select()
    .from(downloads)
    .where(inArray(downloads.id, ids));

  // 진행 중인 다운로드 kill + 파일 삭제
  for (const dl of toDelete) {
    const active = activeDownloads.get(dl.id);
    if (active) {
      active.kill();
      activeDownloads.delete(dl.id);
    }
    if (dl.filePath && fs.existsSync(dl.filePath)) {
      fs.unlinkSync(dl.filePath);
    }
  }

  // DB 삭제
  if (ids.length === 1) {
    await db.delete(downloads).where(eq(downloads.id, ids[0]));
  } else {
    await db.delete(downloads).where(inArray(downloads.id, ids));
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}
