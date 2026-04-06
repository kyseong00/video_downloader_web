import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, downloads } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  const [download] = isAdmin
    ? await db.select().from(downloads).where(eq(downloads.id, params.id))
    : await db.select().from(downloads)
        .where(and(eq(downloads.id, params.id), eq(downloads.userId, session.user.id)));

  if (!download) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (download.status !== "DONE") return NextResponse.json({ error: "파일이 아직 준비되지 않았습니다" }, { status: 400 });
  if (!download.filePath || !fs.existsSync(download.filePath)) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }

  const stat = fs.statSync(download.filePath);
  const ext = path.extname(download.filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".opus": "audio/ogg",
  };
  const contentType = mimeMap[ext] || "application/octet-stream";

  const isDownload = req.nextUrl.searchParams.get("dl") === "1";
  const filename = encodeURIComponent(path.basename(download.filePath));

  // Range 요청 지원 (브라우저 미디어 플레이어용)
  const range = req.headers.get("range");
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(download.filePath, { start, end });

    return new NextResponse(fileStream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": contentType,
      },
    });
  }

  const fileStream = fs.createReadStream(download.filePath);
  return new NextResponse(fileStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      ...(isDownload ? { "Content-Disposition": `attachment; filename*=UTF-8''${filename}` } : {}),
    },
  });
}
