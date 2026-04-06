import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, downloads } from "@/lib/db";
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

// GET /api/admin/downloads?userId=xxx — 특정 사용자의 다운로드 목록
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId 필요" }, { status: 400 });

  const userDownloads = await db
    .select()
    .from(downloads)
    .where(eq(downloads.userId, userId))
    .orderBy(desc(downloads.createdAt));

  return NextResponse.json(userDownloads);
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
