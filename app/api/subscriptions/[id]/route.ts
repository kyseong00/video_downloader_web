import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, subscriptions, downloads, deletedVideos } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import fs from "fs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [sub] = await db.update(subscriptions)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(and(eq(subscriptions.id, params.id), eq(subscriptions.userId, session.user.id)))
    .returning();

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sub);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleteFiles = req.nextUrl.searchParams.get("deleteFiles") === "1";

  if (deleteFiles) {
    // 이 구독에서 받은 다운로드 파일 + 레코드 삭제. 삭제 이력은 남기지 않음 (재구독 시 다시 받도록).
    const subDownloads = await db.select().from(downloads)
      .where(and(eq(downloads.subscriptionId, params.id), eq(downloads.userId, session.user.id)));
    for (const d of subDownloads) {
      if (d.filePath && fs.existsSync(d.filePath)) {
        try { fs.unlinkSync(d.filePath); } catch { /* ignore */ }
      }
    }
    await db.delete(downloads)
      .where(and(eq(downloads.subscriptionId, params.id), eq(downloads.userId, session.user.id)));
  }

  // 같은 구독 ID로 쌓인 삭제 이력은 함께 정리 — 재구독 시 다시 받을 수 있게.
  await db.delete(deletedVideos)
    .where(and(eq(deletedVideos.subscriptionId, params.id), eq(deletedVideos.userId, session.user.id)));

  await db.delete(subscriptions)
    .where(and(eq(subscriptions.id, params.id), eq(subscriptions.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
