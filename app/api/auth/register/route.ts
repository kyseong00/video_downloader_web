import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { migrateDB } from "@/lib/db/migrate";

export async function POST(req: NextRequest) {
  try {
    await migrateDB();
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // First user becomes admin and auto-approved
    const allUsers = await db.select().from(users);
    const isFirst = allUsers.length === 0;
    const role = isFirst ? "ADMIN" : "USER";
    const status = isFirst ? "APPROVED" : "PENDING";

    const [newUser] = await db.insert(users).values({
      id: generateId(),
      email,
      password: hashedPassword,
      name,
      role,
      status,
    }).returning();

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      status: newUser.status,
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
