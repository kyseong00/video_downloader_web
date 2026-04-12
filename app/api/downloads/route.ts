import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, downloads, userSettings, users } from "@/lib/db";
import { eq, desc, asc } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { downloadVideo, ensureDownloadPath } from "@/lib/ytdlp";
import { activeDownloads } from "@/lib/active-downloads";
import path from "path";
import fs from "fs";
import { migrateDB } from "@/lib/db/migrate";

async function getAdminSettings() {
  const [adminUser] = await db.select().from(users).where(eq(users.role, "ADMIN"));
  if (!adminUser) return { maxGlobalConcurrent: 3, globalRateLimit: "" };
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, adminUser.id));
  return settings ?? { maxGlobalConcurrent: 3, globalRateLimit: "" };
}

function calculatePerDownloadRate(globalRateLimit: string, concurrent: number): string {
  if (!globalRateLimit?.trim()) return "";
  const match = globalRateLimit.trim().match(/^(\d+(?:\.\d+)?)(K|M)$/i);
  if (!match) return globalRateLimit;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const per = Math.max(1, Math.round(value / concurrent));
  return `${per}${unit}`;
}

async function startNextPending() {
  const adminSettings = await getAdminSettings();
  const maxConcurrent = adminSettings.maxGlobalConcurrent ?? 3;
  if (activeDownloads.size >= maxConcurrent) return;

  const [pending] = await db.select().from(downloads)
    .where(eq(downloads.status, "PENDING"))
    .orderBy(asc(downloads.createdAt))
    .limit(1);
  if (!pending) return;

  const [userSettingsRow] = await db.select().from(userSettings).where(eq(userSettings.userId, pending.userId));
  const outputDir = ensureDownloadPath(pending.userId);
  const extraArgs = userSettingsRow?.ytdlpArgs
    ? userSettingsRow.ytdlpArgs.trim().split(/\s+/).filter(Boolean)
    : [];

  const perDownloadRate = calculatePerDownloadRate(
    adminSettings.globalRateLimit ?? "",
    maxConcurrent
  ) || userSettingsRow?.rateLimit || "";

  startDownload(
    pending.id,
    pending.url,
    outputDir,
    pending.format,
    pending.quality,
    pending.userId,
    userSettingsRow?.cookieContent || "",
    extraArgs,
    perDownloadRate,
    true
  );
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await migrateDB();
    const userDownloads = await db
      .select()
      .from(downloads)
      .where(eq(downloads.userId, session.user.id))
      .orderBy(desc(downloads.createdAt));

    return NextResponse.json(userDownloads);
  } catch (error) {
    console.error("Downloads GET error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { url, format = "mp4", quality = "best", type = "VIDEO", noPlaylist = true } = await req.json();
    if (!url) return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });

    await migrateDB();

    // Load user settings for cookie/args/rateLimit
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id));

    const id = generateId();
    const outputDir = ensureDownloadPath(session.user.id);

    // Create download record
    const [download] = await db.insert(downloads).values({
      id,
      url,
      title: "가져오는 중...",
      format,
      quality,
      type: type as "VIDEO" | "AUDIO",
      status: "PENDING",
      progress: 0,
      userId: session.user.id,
    }).returning();

    // Parse extra args from settings
    const extraArgs = settings?.ytdlpArgs
      ? settings.ytdlpArgs.trim().split(/\s+/).filter(Boolean)
      : [];

    // Check global concurrent limit
    const adminSettings = await getAdminSettings();
    const maxConcurrent = adminSettings.maxGlobalConcurrent ?? 3;

    if (activeDownloads.size >= maxConcurrent) {
      // Queue as PENDING — startNextPending will pick it up when a slot opens
      return NextResponse.json(download, { status: 201 });
    }

    const perDownloadRate = calculatePerDownloadRate(
      adminSettings.globalRateLimit ?? "",
      maxConcurrent
    ) || settings?.rateLimit || "";

    // Start download asynchronously
    startDownload(
      id,
      url,
      outputDir,
      format,
      quality,
      session.user.id,
      settings?.cookieContent || "",
      extraArgs,
      perDownloadRate,
      noPlaylist
    );

    return NextResponse.json(download, { status: 201 });
  } catch (error) {
    console.error("Downloads POST error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

async function startDownload(
  id: string,
  url: string,
  outputDir: string,
  format: string,
  quality: string,
  userId: string,
  cookieContent: string,
  extraArgs: string[],
  rateLimit: string,
  noPlaylist = true
) {
  try {
    await db.update(downloads).set({ status: "DOWNLOADING" }).where(eq(downloads.id, id));

    // noPlaylist=false면 플레이리스트 전체 다운로드 (--no-playlist 제거)
    const allExtraArgs = noPlaylist ? extraArgs : ["--yes-playlist", ...extraArgs];

    // 진행률 DB write 쓰로틀 — 1% 변화 또는 2초마다만 업데이트
    let lastWrittenProgress = -1;
    let lastWriteTime = 0;
    let pendingProgressWrite: ReturnType<typeof setTimeout> | null = null;

    const flushProgress = async (progress: number, speed?: string, eta?: string) => {
      lastWrittenProgress = progress;
      lastWriteTime = Date.now();
      await db.update(downloads)
        .set({
          progress,
          status: "DOWNLOADING",
          ...(speed !== undefined ? { speed } : {}),
          ...(eta !== undefined ? { eta } : {}),
        })
        .where(eq(downloads.id, id));
    };

    const dl = downloadVideo(url, outputDir, {
      format,
      quality,
      noPlaylist,
      cookieContent: cookieContent || undefined,
      extraArgs: allExtraArgs.length > 0 ? allExtraArgs : undefined,
      rateLimit: rateLimit || undefined,
      onProgress: (progress, speed, eta) => {
        const now = Date.now();
        const progressDelta = Math.abs(progress - lastWrittenProgress);
        const timeDelta = now - lastWriteTime;

        // 1% 이상 변화 또는 2초 경과 시에만 DB write
        if (progressDelta >= 1 || timeDelta >= 2000) {
          if (pendingProgressWrite) { clearTimeout(pendingProgressWrite); pendingProgressWrite = null; }
          flushProgress(progress, speed, eta).catch(() => {});
        } else {
          // 마지막 값은 2초 후 반드시 반영
          if (!pendingProgressWrite) {
            pendingProgressWrite = setTimeout(() => {
              pendingProgressWrite = null;
              flushProgress(progress, speed, eta).catch(() => {});
            }, 2000);
          }
        }
      },
      onInfo: (info) => {
        // 이벤트 루프를 막지 않도록 setImmediate로 지연
        setImmediate(async () => {
          const raw = info as unknown as Record<string, unknown>;
          const filePath = (raw._filename || raw.filename) as string | undefined;
          const fileSize = (raw.filesize || raw.filesize_approx) as number | undefined;
          const width = (raw.width) as number | undefined;
          const height = (raw.height) as number | undefined;
          await db.update(downloads)
            .set({
              title: info.title || "Unknown",
              thumbnail: info.thumbnail,
              duration: info.duration,
              ...(filePath ? { filePath } : {}),
              ...(fileSize ? { fileSize } : {}),
              ...(width ? { width } : {}),
              ...(height ? { height } : {}),
            })
            .where(eq(downloads.id, id));
        });
      },
    });

    activeDownloads.set(id, dl);

    await new Promise<void>((resolve, reject) => {
      dl.process.on("close", async (code) => {
        // 중요: 먼저 pending progress write를 취소해야 DONE을 덮어쓰지 않음
        if (pendingProgressWrite) { clearTimeout(pendingProgressWrite); pendingProgressWrite = null; }
        activeDownloads.delete(id);

        try {
          // 취소된 경우 이미 ERROR로 설정됨 — 덮어쓰지 않음
          const [current] = await db.select().from(downloads).where(eq(downloads.id, id));
          if (current?.status === "ERROR") { resolve(); return; }

          if (code === 0) {
            let actualFileSize = current?.fileSize;
            if (current?.filePath && fs.existsSync(current.filePath)) {
              actualFileSize = fs.statSync(current.filePath).size;
            }
            await db.update(downloads)
              .set({
                status: "DONE",
                progress: 100,
                speed: null,
                eta: null,
                ...(actualFileSize ? { fileSize: actualFileSize } : {})
              })
              .where(eq(downloads.id, id));
            startNextPending().catch(() => {});
            resolve();
          } else {
            await db.update(downloads)
              .set({ status: "ERROR", error: "다운로드 실패" })
              .where(eq(downloads.id, id));
            startNextPending().catch(() => {});
            reject(new Error("Download failed"));
          }
        } catch (err) {
          console.error("Close handler error:", err);
          reject(err);
        }
      });

      dl.process.on("error", async (err) => {
        if (pendingProgressWrite) { clearTimeout(pendingProgressWrite); pendingProgressWrite = null; }
        activeDownloads.delete(id);
        await db.update(downloads)
          .set({ status: "ERROR", error: err.message })
          .where(eq(downloads.id, id));
        reject(err);
      });
    });
  } catch (error) {
    console.error("Download error:", error);
    await db.update(downloads)
      .set({ status: "ERROR", error: String(error) })
      .where(eq(downloads.id, id));
  }
}
