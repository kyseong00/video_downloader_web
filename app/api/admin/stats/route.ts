import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users, downloads } from "@/lib/db";
import { count } from "drizzle-orm";
import { migrateDB } from "@/lib/db/migrate";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await migrateDB();

  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(users);
  const allDownloads = await db.select({
    status: downloads.status,
    fileSize: downloads.fileSize,
  }).from(downloads);

  const stats = {
    totalUsers,
    totalDownloads: allDownloads.length,
    activeDownloads: allDownloads.filter(d => ["DOWNLOADING", "PENDING"].includes(d.status)).length,
    completedDownloads: allDownloads.filter(d => d.status === "DONE").length,
    errorDownloads: allDownloads.filter(d => d.status === "ERROR").length,
    totalSize: allDownloads.reduce((acc, d) => acc + (d.fileSize ?? 0), 0),
  };

  return NextResponse.json(stats);
}
