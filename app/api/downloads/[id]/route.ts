import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, downloads } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import { activeDownloads } from "@/lib/active-downloads";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  const [download] = isAdmin
    ? await db.select().from(downloads).where(eq(downloads.id, params.id))
    : await db.select().from(downloads)
        .where(and(eq(downloads.id, params.id), eq(downloads.userId, session.user.id)));

  if (!download) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(download);
}

// PATCH /api/downloads/[id] — 진행 중인 다운로드 취소
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();
  if (action !== "cancel") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const [download] = await db.select().from(downloads)
    .where(and(eq(downloads.id, params.id), eq(downloads.userId, session.user.id)));

  if (!download) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 진행 중인 프로세스 kill
  const active = activeDownloads.get(params.id);
  if (active) {
    active.kill();
    activeDownloads.delete(params.id);
  }

  await db.update(downloads)
    .set({ status: "ERROR", error: "사용자가 취소했습니다" })
    .where(eq(downloads.id, params.id));

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [download] = await db.select().from(downloads)
    .where(and(eq(downloads.id, params.id), eq(downloads.userId, session.user.id)));

  if (!download) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 진행 중이면 먼저 kill
  const active = activeDownloads.get(params.id);
  if (active) {
    active.kill();
    activeDownloads.delete(params.id);
  }

  // Delete file if exists
  if (download.filePath && fs.existsSync(download.filePath)) {
    fs.unlinkSync(download.filePath);
  }

  await db.delete(downloads).where(eq(downloads.id, params.id));
  return NextResponse.json({ success: true });
}
