import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, subscriptions } from "@/lib/db";
import { eq, and } from "drizzle-orm";

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

  await db.delete(subscriptions)
    .where(and(eq(subscriptions.id, params.id), eq(subscriptions.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
