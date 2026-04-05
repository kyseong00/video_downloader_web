import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appConfig } from "@/lib/db";
import { eq } from "drizzle-orm";
import { migrateDB } from "@/lib/db/migrate";

const DEFAULT_SITE_NAME = "video_downloader";

async function getSiteName(): Promise<string> {
  await migrateDB();
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, "siteName"));
  return row?.value || DEFAULT_SITE_NAME;
}

export async function GET() {
  const siteName = await getSiteName();
  return NextResponse.json({ siteName });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await migrateDB();

  const body = await req.json();
  const siteName = typeof body.siteName === "string" ? body.siteName.trim() : "";
  if (!siteName) {
    return NextResponse.json({ error: "siteName required" }, { status: 400 });
  }

  const [existing] = await db.select().from(appConfig).where(eq(appConfig.key, "siteName"));
  if (existing) {
    await db.update(appConfig).set({ value: siteName }).where(eq(appConfig.key, "siteName"));
  } else {
    await db.insert(appConfig).values({ key: "siteName", value: siteName });
  }
  return NextResponse.json({ siteName });
}
