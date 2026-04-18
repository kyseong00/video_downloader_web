import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appConfig } from "@/lib/db";
import { eq } from "drizzle-orm";
import { migrateDB } from "@/lib/db/migrate";

const DEFAULT_SITE_NAME = "video_downloader";
const DEFAULT_INITIAL_MAX_VIDEOS = 10;

async function readConfig(key: string): Promise<string | null> {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key));
  return row?.value ?? null;
}

async function writeConfig(key: string, value: string) {
  const [existing] = await db.select().from(appConfig).where(eq(appConfig.key, key));
  if (existing) {
    await db.update(appConfig).set({ value }).where(eq(appConfig.key, key));
  } else {
    await db.insert(appConfig).values({ key, value });
  }
}

export async function GET() {
  await migrateDB();
  const siteName = (await readConfig("siteName")) || DEFAULT_SITE_NAME;
  const raw = await readConfig("defaultInitialMaxVideos");
  const parsed = raw != null ? Number(raw) : NaN;
  const defaultInitialMaxVideos = Number.isFinite(parsed) && parsed >= 0
    ? Math.min(500, Math.max(0, parsed))
    : DEFAULT_INITIAL_MAX_VIDEOS;
  return NextResponse.json({ siteName, defaultInitialMaxVideos });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await migrateDB();

  const body = await req.json();
  const result: Record<string, unknown> = {};

  if (body.siteName !== undefined) {
    const siteName = typeof body.siteName === "string" ? body.siteName.trim() : "";
    if (!siteName) return NextResponse.json({ error: "siteName required" }, { status: 400 });
    await writeConfig("siteName", siteName);
    result.siteName = siteName;
  }

  if (body.defaultInitialMaxVideos !== undefined) {
    const n = Number(body.defaultInitialMaxVideos);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "invalid defaultInitialMaxVideos" }, { status: 400 });
    }
    const clamped = Math.min(500, Math.max(0, Math.floor(n)));
    await writeConfig("defaultInitialMaxVideos", String(clamped));
    result.defaultInitialMaxVideos = clamped;
  }

  if (Object.keys(result).length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }
  return NextResponse.json(result);
}
