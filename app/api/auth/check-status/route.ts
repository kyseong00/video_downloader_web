import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ status: "UNKNOWN" });

  const [user] = await db.select({ status: users.status }).from(users).where(eq(users.email, email));
  if (!user) return NextResponse.json({ status: "UNKNOWN" });

  return NextResponse.json({ status: user.status });
}
