import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, userSettings, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { migrateDB } from "@/lib/db/migrate";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await migrateDB();

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id));
  if (!settings) {
    const [newSettings] = await db.insert(userSettings).values({
      id: generateId(),
      userId: session.user.id,
    }).returning();
    return NextResponse.json(newSettings);
  }
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const body = await req.json();

  // USER can only change format and quality
  const allowedFields = role === "ADMIN"
    ? body
    : { defaultFormat: body.defaultFormat, defaultQuality: body.defaultQuality };

  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id));

  if (!existing) {
    const [settings] = await db.insert(userSettings).values({
      id: generateId(),
      userId: session.user.id,
      ...allowedFields,
    }).returning();
    return NextResponse.json(settings);
  }

  const [settings] = await db.update(userSettings).set(allowedFields)
    .where(eq(userSettings.userId, session.user.id)).returning();
  return NextResponse.json(settings);
}
