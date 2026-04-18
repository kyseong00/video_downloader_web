import { db, subscriptions, downloads, deletedVideos } from "./db";
import { eq, and, isNull, or } from "drizzle-orm";
import { generateId } from "./utils";
import { ensureDownloadPath, downloadVideo } from "./ytdlp";
import { spawn } from "child_process";
import fs from "fs";

type UserSettings = {
  userId: string;
  cookieContent?: string | null;
  ytdlpArgs?: string | null;
  rateLimit?: string | null;
  maxGlobalConcurrent?: number;
  globalRateLimit?: string | null;
};

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

export async function getLatestVideos(
  channelUrl: string,
  cookieContent?: string,
  maxVideos?: number
): Promise<{ id: string; url: string; title: string }[]> {
  let cookiePath: string | null = null;
  if (cookieContent && cookieContent.trim()) {
    cookiePath = writeTempCookie(cookieContent);
  }

  return new Promise((resolve) => {
    const args: string[] = [
      "--flat-playlist",
      "--dump-json",
      "--no-warnings",
    ];

    if (maxVideos && maxVideos > 0) {
      args.push("--playlist-end", String(maxVideos));
    }

    if (cookiePath) {
      args.push("--cookies", cookiePath);
    }

    args.push(channelUrl);

    const proc = spawn("yt-dlp", args);
    let output = "";
    proc.stdout.on("data", (d: Buffer) => (output += d.toString()));
    proc.on("close", (code) => {
      if (cookiePath) cleanupTempFile(cookiePath);
      if (code !== 0) { resolve([]); return; }
      const videos: { id: string; url: string; title: string }[] = [];
      for (const line of output.trim().split("\n")) {
        if (!line) continue;
        try {
          const info = JSON.parse(line);
          if (!info.id) continue;
          // 비공개/삭제/제한된 영상은 스킵 (큐잉조차 안 함)
          const title: string = info.title || "";
          if (/^\[(private|deleted|unavailable|removed) video\]$/i.test(title)) continue;
          const availability: string | undefined = info.availability;
          if (availability && ["private", "needs_auth", "subscriber_only", "premium_only"].includes(availability)) continue;
          videos.push({
            id: info.id,
            url: info.url || info.webpage_url || `https://www.youtube.com/watch?v=${info.id}`,
            title: title || info.id,
          });
        } catch { /* ignore */ }
      }
      resolve(videos);
    });
    proc.on("error", () => {
      if (cookiePath) cleanupTempFile(cookiePath);
      resolve([]);
    });
  });
}

export async function startSubscriptionDownload(
  id: string,
  url: string,
  outputDir: string,
  format: string,
  quality: string,
  userId: string,
  settings?: UserSettings
) {
  try {
    await db.update(downloads).set({ status: "DOWNLOADING" }).where(eq(downloads.id, id));

    const extraArgs = settings?.ytdlpArgs
      ? settings.ytdlpArgs.trim().split(/\s+/).filter(Boolean)
      : [];

    // 글로벌 rate limit이 있으면 개별 rate limit보다 우선
    const rateLimit = settings?.globalRateLimit || settings?.rateLimit || undefined;

    // 진행률 DB write 쓰로틀 — 1% 변화 또는 2초마다만 업데이트 (SQLite writer 락 경합 완화)
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
      cookieContent: settings?.cookieContent || undefined,
      extraArgs: extraArgs.length > 0 ? extraArgs : undefined,
      rateLimit: rateLimit || undefined,
      onProgress: (progress, speed, eta) => {
        const now = Date.now();
        const progressDelta = Math.abs(progress - lastWrittenProgress);
        const timeDelta = now - lastWriteTime;
        if (progressDelta >= 1 || timeDelta >= 2000) {
          if (pendingProgressWrite) { clearTimeout(pendingProgressWrite); pendingProgressWrite = null; }
          flushProgress(progress, speed, eta).catch(() => {});
        } else if (!pendingProgressWrite) {
          pendingProgressWrite = setTimeout(() => {
            pendingProgressWrite = null;
            flushProgress(progress, speed, eta).catch(() => {});
          }, 2000);
        }
      },
      onInfo: async (info) => {
        const raw = info as unknown as Record<string, unknown>;
        const filePath = (raw._filename || raw.filename) as string | undefined;
        const fileSize = (raw.filesize || raw.filesize_approx) as number | undefined;
        await db.update(downloads).set({
          title: info.title || "Unknown",
          thumbnail: info.thumbnail,
          duration: info.duration,
          ...(filePath ? { filePath } : {}),
          ...(fileSize ? { fileSize } : {}),
        }).where(eq(downloads.id, id));
      },
    });

    await new Promise<void>((resolve, reject) => {
      dl.process.on("close", async (code) => {
        if (pendingProgressWrite) { clearTimeout(pendingProgressWrite); pendingProgressWrite = null; }
        if (code === 0) {
          const [current] = await db.select().from(downloads).where(eq(downloads.id, id));
          let actualFileSize = current?.fileSize;
          if (current?.filePath && fs.existsSync(current.filePath)) {
            actualFileSize = fs.statSync(current.filePath).size;
          }
          await db.update(downloads)
            .set({ status: "DONE", progress: 100, speed: null, eta: null, ...(actualFileSize ? { fileSize: actualFileSize } : {}) })
            .where(eq(downloads.id, id));
          resolve();
        } else {
          await db.update(downloads)
            .set({ status: "ERROR", error: "다운로드 실패" })
            .where(eq(downloads.id, id));
          reject();
        }
      });
      dl.process.on("error", async (err) => {
        await db.update(downloads).set({ status: "ERROR", error: err.message }).where(eq(downloads.id, id));
        reject(err);
      });
    });
  } catch (err) {
    await db.update(downloads).set({ status: "ERROR", error: String(err) }).where(eq(downloads.id, id));
  }
}

/** URL에서 YouTube video ID를 추출 */
function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|\/watch\?v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/**
 * 동시 다운로드 수를 제한하면서 큐 처리
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch {
        // 개별 다운로드 실패는 무시 (이미 DB에 ERROR로 저장됨)
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function checkUserSubscriptions(
  userId: string,
  settings: UserSettings,
  options?: { fetchAll?: boolean }
): Promise<{ checked: number; queued: number }> {
  const subs = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.isActive, true)));

  if (subs.length === 0) return { checked: 0, queued: 0 };

  // 중복 체크: 구독 소스(SUBSCRIPTION) 또는 source NULL(마이그레이션 이전 레코드)인 기존 다운로드
  const existingDownloads = await db.select({ url: downloads.url }).from(downloads)
    .where(and(
      eq(downloads.userId, userId),
      or(eq(downloads.source, "SUBSCRIPTION"), isNull(downloads.source)),
    ));
  const existingIds = new Set<string>();
  for (const d of existingDownloads) {
    const vid = extractVideoId(d.url);
    if (vid) existingIds.add(vid);
    existingIds.add(d.url);
  }

  // 재다운로드 방지 — SUBSCRIPTION 소스로 삭제된 video ID는 제외
  const deleted = await db.select({ videoId: deletedVideos.videoId }).from(deletedVideos)
    .where(and(eq(deletedVideos.userId, userId), eq(deletedVideos.source, "SUBSCRIPTION")));
  for (const d of deleted) existingIds.add(d.videoId);

  const maxConcurrent = settings.maxGlobalConcurrent ?? 3;
  const outputDir = ensureDownloadPath(userId);
  const cookieContent = settings.cookieContent || "";

  // 1단계: 모든 채널에서 영상 목록 수집 (빠름, flat-playlist)
  const downloadTasks: { id: string; url: string; format: string; quality: string }[] = [];

  for (const sub of subs) {
    try {
      // 신규 채널(최초 체크 전)은 initialMaxVideos만큼만 — 사이트 응답 보호.
      // 기존 채널은 fetchAll이면 전체, 아니면 30개까지.
      const isFirstCheck = !sub.firstCheckDone;
      const channelMaxVideos = isFirstCheck
        ? (sub.initialMaxVideos ?? 10)
        : (options?.fetchAll ? undefined : 30);

      const videos = await getLatestVideos(sub.channelUrl, cookieContent || undefined, channelMaxVideos);
      // 오래된 영상부터 다운로드하도록 역순 정렬
      videos.reverse();

      for (const video of videos) {
        const vid = extractVideoId(video.url);
        if ((vid && existingIds.has(vid)) || existingIds.has(video.url)) continue;

        const id = generateId();
        await db.insert(downloads).values({
          id,
          url: video.url,
          title: video.title,
          format: sub.format,
          quality: sub.quality,
          type: ["mp3", "m4a", "wav", "opus"].includes(sub.format) ? "AUDIO" : "VIDEO",
          status: "PENDING",
          progress: 0,
          source: "SUBSCRIPTION",
          subscriptionId: sub.id,
          userId,
        });

        if (vid) existingIds.add(vid);
        existingIds.add(video.url);
        downloadTasks.push({ id, url: video.url, format: sub.format, quality: sub.quality });
      }

      await db.update(subscriptions)
        .set({ lastChecked: new Date().toISOString(), firstCheckDone: true })
        .where(eq(subscriptions.id, sub.id));
    } catch (err) {
      console.error(`Subscription check error for ${sub.channelName}:`, err);
    }
  }

  // 2단계: 동시 다운로드 제한하면서 실제 다운로드 실행
  if (downloadTasks.length > 0) {
    const tasks = downloadTasks.map(t => () =>
      startSubscriptionDownload(t.id, t.url, outputDir, t.format, t.quality, userId, settings)
    );
    runWithConcurrency(tasks, maxConcurrent).catch(err => {
      console.error("[subscription-worker] concurrency error:", err);
    });
  }

  return { checked: subs.length, queued: downloadTasks.length };
}
