import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 6;

// PATCH /api/user/password — 비밀번호 변경
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요" }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다` }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });

  const passwordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db.update(users)
    .set({ password: hashedPassword, mustChangePassword: false })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
