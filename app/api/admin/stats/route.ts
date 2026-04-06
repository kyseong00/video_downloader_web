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
    userId: downloads.userId,
  }).from(downloads);

  // 유저별 용량 집계
  const userStorageMap: Record<string, number> = {};
  for (const d of allDownloads) {
    userStorageMap[d.userId] = (userStorageMap[d.userId] ?? 0) + (d.fileSize ?? 0);
  }

  // 유저 이름 조회
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const userStorage = allUsers.map(u => ({
    id: u.id,
    name: u.name,
    size: userStorageMap[u.id] ?? 0,
  })).filter(u => u.size > 0).sort((a, b) => b.size - a.size);

  const stats = {
    totalUsers,
    totalDownloads: allDownloads.length,
    activeDownloads: allDownloads.filter(d => ["DOWNLOADING", "PENDING"].includes(d.status)).length,
    completedDownloads: allDownloads.filter(d => d.status === "DONE").length,
    errorDownloads: allDownloads.filter(d => d.status === "ERROR").length,
    totalSize: allDownloads.reduce((acc, d) => acc + (d.fileSize ?? 0), 0),
    userStorage,
  };

  return NextResponse.json(stats);
}
