import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  formats: Format[];
  uploader: string;
  upload_date: string;
  view_count: number;
  description: string;
  isPlaylist?: boolean;
  playlistCount?: number;
  viewCount?: number;
}

export interface Format {
  format_id: string;
  ext: string;
  resolution: string;
  filesize: number;
  vcodec: string;
  acodec: string;
  format_note: string;
}

export interface DownloadOptions {
  format?: string;
  quality?: string;
  outputPath?: string;
  noPlaylist?: boolean;
  cookieContent?: string;
  extraArgs?: string[];
  rateLimit?: string;
  onProgress?: (progress: number, speed?: string, eta?: string) => void;
  onInfo?: (info: VideoInfo) => void;
}

const DOWNLOAD_BASE_PATH = process.env.DOWNLOAD_PATH || "./public/downloads";

export function ensureDownloadPath(subDir?: string): string {
  const fullPath = subDir
    ? path.join(DOWNLOAD_BASE_PATH, subDir)
    : DOWNLOAD_BASE_PATH;
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

function writeTempCookie(cookieContent: string): string {
  const tmpPath = `/tmp/ytdlp-cookies-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  fs.writeFileSync(tmpPath, cookieContent, "utf-8"); // spawn 전에 필요하므로 sync 유지
  return tmpPath;
}

function cleanupTempFile(filePath: string) {
  // 비동기로 삭제해 이벤트 루프를 막지 않음
  fs.unlink(filePath, () => {});
}

export async function getVideoInfo(url: string, cookieContent?: string): Promise<VideoInfo> {
  let cookiePath: string | null = null;
  if (cookieContent && cookieContent.trim()) {
    cookiePath = writeTempCookie(cookieContent);
  }

  return new Promise((resolve, reject) => {
    // Use --flat-playlist to detect playlist type without downloading all items
    const args: string[] = [
      "--flat-playlist",
      "--playlist-end", "1",
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

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      errOutput += data.toString();
    });

    proc.on("close", async (code) => {
      if (cookiePath) cleanupTempFile(cookiePath);

      if (code !== 0) {
        reject(new Error(errOutput || "yt-dlp failed to get video info"));
        return;
      }

      try {
        const lines = output.trim().split("\n").filter(l => l.trim().startsWith("{"));
        if (lines.length === 0) {
          reject(new Error("No info returned from yt-dlp"));
          return;
        }

        const firstInfo = JSON.parse(lines[0]);
        // playlist_id가 있으면 플레이리스트 URL임
        const isPlaylist = !!(firstInfo.playlist_id || firstInfo._type === "playlist" || firstInfo._type === "multi_video");

        if (isPlaylist) {
          // playlist_count는 --flat-playlist 결과에 바로 포함됨
          const playlistCount: number = firstInfo.playlist_count || lines.length;
          const thumb = firstInfo.thumbnail || firstInfo.thumbnails?.[0]?.url || "";
          resolve({
            id: firstInfo.playlist_id || firstInfo.id || "",
            title: firstInfo.playlist_title || firstInfo.title || "",
            thumbnail: thumb,
            duration: firstInfo.duration || 0,
            formats: [],
            uploader: firstInfo.playlist_uploader || firstInfo.uploader || firstInfo.channel || "",
            upload_date: firstInfo.upload_date || "",
            view_count: firstInfo.view_count || 0,
            viewCount: firstInfo.view_count || 0,
            description: firstInfo.description || "",
            isPlaylist: true,
            playlistCount,
          });
        } else {
          resolve({
            ...firstInfo,
            isPlaylist: false,
            viewCount: firstInfo.view_count || 0,
            uploader: firstInfo.uploader || firstInfo.channel || "",
          } as VideoInfo);
        }
      } catch {
        reject(new Error("Failed to parse video info"));
      }
    });

    proc.on("error", () => {
      if (cookiePath) cleanupTempFile(cookiePath);
      reject(new Error("yt-dlp not found. Please install yt-dlp."));
    });
  });
}

async function getPlaylistCount(url: string, cookieContent?: string): Promise<number> {
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

    if (cookiePath) {
      args.push("--cookies", cookiePath);
    }

    args.push(url);

    const proc = spawn("yt-dlp", args);
    let output = "";

    proc.stdout.on("data", (d: Buffer) => (output += d.toString()));
    proc.on("close", () => {
      if (cookiePath) cleanupTempFile(cookiePath);
      const count = output.trim().split("\n").filter(l => l.trim().startsWith("{")).length;
      resolve(count);
    });
    proc.on("error", () => {
      if (cookiePath) cleanupTempFile(cookiePath);
      resolve(0);
    });
  });
}

export function buildFormatString(quality: string, format: string): string {
  if (format === "mp3" || format === "m4a" || format === "wav") {
    return "bestaudio/best";
  }

  const qualityMap: Record<string, string> = {
    "best": "bestvideo+bestaudio/best",
    "2160p": "bestvideo[height<=2160]+bestaudio/best[height<=2160]",
    "1440p": "bestvideo[height<=1440]+bestaudio/best[height<=1440]",
    "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
    "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]",
    "480p": "bestvideo[height<=480]+bestaudio/best[height<=480]",
    "360p": "bestvideo[height<=360]+bestaudio/best[height<=360]",
  };

  return qualityMap[quality] || "bestvideo+bestaudio/best";
}

export function downloadVideo(
  url: string,
  outputDir: string,
  options: DownloadOptions
): { process: ReturnType<typeof spawn>; kill: () => void } {
  const { format = "mp4", quality = "best", noPlaylist = true, onProgress, cookieContent, extraArgs, rateLimit } = options;
  const isAudio = ["mp3", "m4a", "wav", "opus"].includes(format);
  const formatStr = buildFormatString(quality, format);

  let cookiePath: string | null = null;
  if (cookieContent && cookieContent.trim()) {
    cookiePath = writeTempCookie(cookieContent);
  }

  const args = [
    "--format", formatStr,
    "--output", path.join(outputDir, noPlaylist ? "%(title)s.%(ext)s" : "%(playlist_index)s - %(title)s.%(ext)s"),
    "--no-warnings",
    "--progress",
    "--newline",
    "--print-json",
  ];

  if (noPlaylist) {
    args.push("--no-playlist");
  }

  if (cookiePath) {
    args.push("--cookies", cookiePath);
  }

  if (rateLimit && rateLimit.trim()) {
    args.push("--rate-limit", rateLimit.trim());
  }

  if (isAudio) {
    args.push(
      "--extract-audio",
      "--audio-format", format,
      "--audio-quality", "0"
    );
  } else {
    args.push(
      "--merge-output-format", format
    );
  }

  if (format === "mp4") {
    args.push("--ppa", "ffmpeg:-movflags +faststart");
  }

  if (extraArgs && extraArgs.length > 0) {
    args.push(...extraArgs);
  }

  args.push(url);

  const proc = spawn("yt-dlp", args);

  let stdoutBuf = "";
  proc.stdout.on("data", (data: Buffer) => {
    stdoutBuf += data.toString();
    const lines = stdoutBuf.split("\n");
    // Keep the last (potentially incomplete) line in the buffer
    stdoutBuf = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("[download]")) {
        const match = line.match(/(\d+\.?\d*)%/);
        if (match && onProgress) {
          const speedMatch = line.match(/at\s+([\d.]+\s*\w+\/s)/);
          const etaMatch = line.match(/ETA\s+([\d:]+)/);
          onProgress(
            parseFloat(match[1]),
            speedMatch?.[1],
            etaMatch?.[1]
          );
        }
      }
      if (line.startsWith("{")) {
        try {
          const info = JSON.parse(line);
          if (options.onInfo) options.onInfo(info);
        } catch { /* ignore */ }
      }
    }
  });

  proc.stdout.on("end", () => {
    // Process remaining buffer
    if (stdoutBuf.startsWith("{")) {
      try {
        const info = JSON.parse(stdoutBuf);
        if (options.onInfo) options.onInfo(info);
      } catch { /* ignore */ }
    }
  });

  proc.on("close", () => {
    if (cookiePath) cleanupTempFile(cookiePath);
  });

  return {
    process: proc,
    kill: () => proc.kill("SIGTERM"),
  };
}

export async function getChannelInfo(url: string): Promise<{
  id: string;
  channel: string;
  channel_url: string;
  thumbnail: string;
}> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", [
      "--dump-json",
      "--playlist-items", "1",
      "--no-warnings",
      url,
    ]);

    let output = "";
    proc.stdout.on("data", (d: Buffer) => (output += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("Failed to get channel info"));
        return;
      }
      try {
        const lines = output.trim().split("\n");
        const info = JSON.parse(lines[0]);
        let channelUrl = info.channel_url || url;
        // 채널 URL에 /videos가 없으면 추가 (전체 영상 목록 접근용)
        if (channelUrl.includes("youtube.com") && !channelUrl.endsWith("/videos")) {
          channelUrl = channelUrl.replace(/\/?$/, "/videos");
        }
        resolve({
          id: info.channel_id || info.uploader_id,
          channel: info.channel || info.uploader,
          channel_url: channelUrl,
          thumbnail: info.thumbnail || "",
        });
      } catch {
        reject(new Error("Failed to parse channel info"));
      }
    });
    proc.on("error", () => reject(new Error("yt-dlp not found")));
  });
}
