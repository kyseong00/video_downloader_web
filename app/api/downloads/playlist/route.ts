import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import fs from "fs";
import { migrateDB } from "@/lib/db/migrate";

interface PlaylistVideo {
  id: string;
  title: string;
  url: string;
  duration?: number;
}

function writeTempCookie(cookieContent: string): string {
  const tmpPath = `/tmp/ytdlp-cookies-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  fs.writeFileSync(tmpPath, cookieContent, "utf-8");
  return tmpPath;
}

function cleanupTempFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* ignore */ }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });

  try {
    await migrateDB();
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id));
    const cookieContent = settings?.cookieContent || "";

    let cookiePath: string | null = null;
    if (cookieContent && cookieContent.trim()) {
      cookiePath = writeTempCookie(cookieContent);
    }

    const result = await new Promise<{ title: string; count: number; videos: PlaylistVideo[] }>((resolve, reject) => {
      const args: string[] = [
        "--flat-playlist",
        "--dump-json",
        "--no-warnings",
      ];

      if (cookiePath) {
        args.push("--cookies", cookiePath);
      }

      args.push(url);

      const proc = spawn("yt-dlp", args);
      let output = "";
      let errOutput = "";

      proc.stdout.on("data", (d: Buffer) => (output += d.toString()));
      proc.stderr.on("data", (d: Buffer) => (errOutput += d.toString()));

      proc.on("close", (code) => {
        if (cookiePath) cleanupTempFile(cookiePath);

        if (code !== 0) {
          reject(new Error(errOutput || "Failed to get playlist info"));
          return;
        }

        const videos: PlaylistVideo[] = [];
        let playlistTitle = "";

        for (const line of output.trim().split("\n")) {
          if (!line.trim().startsWith("{")) continue;
          try {
            const info = JSON.parse(line);
            if (info._type === "playlist") {
              playlistTitle = info.title || "";
            } else if (info.id) {
              videos.push({
                id: info.id,
                title: info.title || info.id,
                url: info.url || info.webpage_url || `https://www.youtube.com/watch?v=${info.id}`,
                duration: info.duration,
              });
            }
          } catch { /* ignore */ }
        }

        // 오래된 영상부터 다운로드하도록 역순 정렬 (채널과 동일)
        videos.reverse();

        resolve({
          title: playlistTitle,
          count: videos.length,
          videos,
        });
      });

      proc.on("error", () => {
        if (cookiePath) cleanupTempFile(cookiePath);
        reject(new Error("yt-dlp not found"));
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
