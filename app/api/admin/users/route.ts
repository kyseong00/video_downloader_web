import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users, downloads } from "@/lib/db";
import { eq, count } from "drizzle-orm";
import { migrateDB } from "@/lib/db/migrate";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await migrateDB();

  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    status: users.status,
    createdAt: users.createdAt,
  }).from(users);

  // 각 유저의 다운로드 수 조회
  const downloadCounts = await db.select({
    userId: downloads.userId,
    count: count(),
  }).from(downloads).groupBy(downloads.userId);

  const countMap = Object.fromEntries(downloadCounts.map(d => [d.userId, d.count]));

  const result = allUsers.map(u => ({
    ...u,
    downloadCount: countMap[u.id] ?? 0,
  }));

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, role, status, resetPassword } = body;

  if (!id) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  if (id === session.user?.id) {
    return NextResponse.json({ error: "자신은 변경할 수 없습니다" }, { status: 400 });
  }

  // 비밀번호 초기화
  if (resetPassword) {
    const tempPassword = crypto.randomBytes(4).toString("hex"); // 8자리 랜덤
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    await db.update(users)
      .set({ password: hashedPassword, mustChangePassword: true })
      .where(eq(users.id, id));
    return NextResponse.json({ success: true, tempPassword });
  }

  const updateData: Record<string, string> = {};
  if (role && ["ADMIN", "USER"].includes(role)) updateData.role = role;
  if (status && ["PENDING", "APPROVED"].includes(status)) updateData.status = status;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "변경할 값이 없습니다" }, { status: 400 });
  }

  const [updated] = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({ id: users.id, role: users.role, status: users.status });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  if (id === session.user?.id) {
    return NextResponse.json({ error: "자신은 삭제할 수 없습니다" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
