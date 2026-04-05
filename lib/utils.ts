import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getThumbnailUrl(thumbnail: string | null | undefined, downloadId?: string): string {
  if (!thumbnail) return "";
  if (thumbnail.startsWith("/")) return thumbnail;
  // External URLs: proxy through our API to avoid CORS/Referer issues
  if (downloadId) return `/api/downloads/${downloadId}/thumbnail`;
  return `/api/thumbnail?url=${encodeURIComponent(thumbnail)}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "DONE": return "text-green-600";
    case "DOWNLOADING": return "text-blue-600";
    case "PROCESSING": return "text-yellow-600";
    case "ERROR": return "text-red-600";
    default: return "text-gray-500";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "PENDING": return "대기 중";
    case "DOWNLOADING": return "다운로드 중";
    case "PROCESSING": return "처리 중";
    case "DONE": return "완료";
    case "ERROR": return "오류";
    default: return status;
  }
}
