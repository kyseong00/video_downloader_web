"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Download, Music, Video, Link, AlertCircle, CheckCircle2,
  Clock, Loader2, Trash2, RefreshCw, Play, Info, X,
  FileVideo, HardDrive, Calendar, Hash, Maximize2,
  List, Zap, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFileSize, formatDuration, getThumbnailUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  filePath?: string;
  fileSize?: number;
  duration?: number;
  width?: number;
  height?: number;
  format: string;
  quality: string;
  status: "PENDING" | "DOWNLOADING" | "PROCESSING" | "DONE" | "ERROR";
  progress: number;
  type: "VIDEO" | "AUDIO";
  speed?: string | null;
  eta?: string | null;
  error?: string;
  createdAt: string;
}

interface PreviewInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  view_count?: number;
  viewCount?: number;
  isPlaylist: boolean;
  playlistCount?: number;
}

const QUALITY_OPTIONS = [
  { value: "best", label: "최고 화질" },
  { value: "2160p", label: "4K (2160p)" },
  { value: "1440p", label: "1440p" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
  { value: "360p", label: "360p" },
];

const VIDEO_FORMATS = ["mp4", "webm", "mkv"];
const AUDIO_FORMATS = ["mp3", "m4a", "wav", "opus"];

function formatViewCount(count?: number): string {
  if (!count) return "";
  if (count >= 100_000_000) return `${(count / 100_000_000).toFixed(1)}억회`;
  if (count >= 10_000) return `${Math.floor(count / 10_000)}만회`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K회`;
  return `${count}회`;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { variant: "pending" as const, icon: Clock, label: "대기 중" },
    DOWNLOADING: { variant: "info" as const, icon: Loader2, label: "다운로드 중" },
    PROCESSING: { variant: "warning" as const, icon: RefreshCw, label: "처리 중" },
    DONE: { variant: "success" as const, icon: CheckCircle2, label: "완료" },
    ERROR: { variant: "destructive" as const, icon: AlertCircle, label: "오류" },
  }[status] || { variant: "outline" as const, icon: Clock, label: status };

  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={cn("h-3 w-3", status === "DOWNLOADING" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

// 삭제 확인 다이얼로그
function DeleteConfirmDialog({ open, onClose, onConfirm, title }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4 text-red-500" />
            삭제 확인
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          &ldquo;{title}&rdquo;을(를) 정말 삭제하시겠습니까?
        </p>
        <p className="text-xs text-muted-foreground">파일과 다운로드 기록이 모두 삭제됩니다.</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">취소</Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1 sm:flex-none">삭제</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 영상 재생 모달
function VideoPlayerDialog({ item, open, onClose }: { item: DownloadItem; open: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="h-4 w-4" />
          </button>
          {item.type === "VIDEO" ? (
            <video
              ref={videoRef}
              src={`/api/downloads/${item.id}/file`}
              controls
              autoPlay
              className="w-full max-h-[80vh]"
              style={{ display: "block" }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 gap-4">
              <Music className="h-16 w-16 text-white/60" />
              <p className="text-white font-medium text-base sm:text-lg text-center">{item.title}</p>
              <audio
                src={`/api/downloads/${item.id}/file`}
                controls
                autoPlay
                className="w-full mt-2"
              />
            </div>
          )}
          <div className="px-4 py-3 bg-black/80">
            <p className="text-white text-sm font-medium truncate">{item.title}</p>
            <p className="text-white/50 text-xs mt-0.5">
              {item.format.toUpperCase()} · {item.quality}
              {item.duration ? ` · ${formatDuration(item.duration)}` : ""}
              {item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ""}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 상세 정보 모달
function DetailsDialog({ item, open, onClose }: { item: DownloadItem; open: boolean; onClose: () => void }) {
  const filename = item.filePath ? item.filePath.split("/").pop() : null;
  const resolution = item.width && item.height ? `${item.width} × ${item.height}` : item.quality !== "best" ? item.quality : null;

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <FileVideo className="h-4 w-4" />, label: "파일명", value: filename || "-" },
    { icon: <HardDrive className="h-4 w-4" />, label: "파일 크기", value: item.fileSize ? formatFileSize(item.fileSize) : "-" },
    { icon: <Maximize2 className="h-4 w-4" />, label: "해상도", value: resolution || "-" },
    { icon: <Clock className="h-4 w-4" />, label: "재생 시간", value: item.duration ? formatDuration(item.duration) : "-" },
    { icon: <Hash className="h-4 w-4" />, label: "형식", value: `${item.format.toUpperCase()} · ${item.type}` },
    { icon: <Calendar className="h-4 w-4" />, label: "다운로드 날짜", value: new Date(item.createdAt).toLocaleString("ko-KR") },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-[#598392]" />
            상세 정보
          </DialogTitle>
        </DialogHeader>

        {item.thumbnail && (
          <div className="rounded-lg overflow-hidden aspect-video bg-muted">
            <img src={getThumbnailUrl(item.thumbnail, item.id)} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        <p className="font-medium text-sm leading-tight">{item.title}</p>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#598392] hover:underline truncate block -mt-2">
          {item.url}
        </a>

        <div className="space-y-2.5 mt-1">
          {rows.map(row => (
            <div key={row.label} className="flex items-start gap-3">
              <span className="text-muted-foreground mt-0.5 shrink-0">{row.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="text-sm font-medium break-all">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {item.filePath && (
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground mb-1">저장 경로</p>
            <p className="text-xs font-mono break-all">{item.filePath}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 썸네일 + 호버 프리뷰
function ThumbnailPreview({ item, onClick, size = "normal" }: { item: DownloadItem; onClick: () => void; size?: "small" | "normal" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);
  const isDoneVideo = item.status === "DONE" && item.type === "VIDEO";
  const isDoneAudio = item.status === "DONE" && item.type === "AUDIO";

  const handleMouseEnter = () => {
    setHovered(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center transition-all duration-200",
        (isDoneVideo || isDoneAudio) && "cursor-pointer",
        isDoneVideo && "hover:ring-2 hover:ring-[#598392]"
      )}
      style={size === "small" ? { width: 100, height: 56 } : { width: 160, height: 90 }}
      onMouseEnter={isDoneVideo ? handleMouseEnter : undefined}
      onMouseLeave={isDoneVideo ? handleMouseLeave : undefined}
      onClick={isDoneVideo || isDoneAudio ? onClick : undefined}
    >
      {item.thumbnail ? (
        <img
          src={getThumbnailUrl(item.thumbnail, item.id)}
          alt={item.title}
          className={cn("w-full h-full object-cover transition-opacity duration-200", hovered && isDoneVideo ? "opacity-0" : "opacity-100")}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {item.type === "AUDIO"
            ? <Music className="h-6 w-6 text-muted-foreground" />
            : <Video className="h-6 w-6 text-muted-foreground" />
          }
        </div>
      )}

      {isDoneVideo && (
        <video
          ref={videoRef}
          src={`/api/downloads/${item.id}/file`}
          muted
          loop
          playsInline
          preload="none"
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-200",
            hovered ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {(isDoneVideo || isDoneAudio) && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200",
          hovered || isDoneAudio ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
            <Play className="h-4 w-4 text-black ml-0.5" fill="black" />
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadCard({ item, onDelete, onCancel }: { item: DownloadItem; onDelete: (id: string) => void; onCancel: (id: string) => void }) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isActive = ["PENDING", "DOWNLOADING", "PROCESSING"].includes(item.status);
  const isDone = item.status === "DONE";

  const speedEta = item.status === "DOWNLOADING" && (item.speed || item.eta)
    ? [item.speed, item.eta ? `ETA ${item.eta}` : null].filter(Boolean).join(" · ")
    : null;

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          <div className="flex gap-2 sm:gap-3">
            {/* 썸네일 - 모바일 작게, 데스크톱 크게 */}
            <div className="shrink-0 block sm:hidden">
              <ThumbnailPreview item={item} onClick={() => setPlayerOpen(true)} size="small" />
            </div>
            <div className="shrink-0 hidden sm:block">
              <ThumbnailPreview item={item} onClick={() => setPlayerOpen(true)} />
            </div>

            {/* 정보 영역 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn("font-medium text-sm truncate", isDone && "cursor-pointer hover:text-[#598392]")}
                    onClick={isDone ? () => setPlayerOpen(true) : undefined}
                  >
                    {item.title || "가져오는 중..."}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.url}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="brand-sub" className="text-[10px] h-4">{item.format.toUpperCase()}</Badge>
                {item.width && item.height
                  ? <span className="text-xs text-muted-foreground">{item.width}×{item.height}</span>
                  : <span className="text-xs text-muted-foreground">{item.quality}</span>
                }
                {item.duration && <span className="text-xs text-muted-foreground">{formatDuration(item.duration)}</span>}
                {item.fileSize && <span className="text-xs text-muted-foreground">{formatFileSize(item.fileSize)}</span>}
              </div>

              {isActive && (
                <div className="mt-2">
                  <Progress value={item.progress} animated={item.status === "DOWNLOADING"} className="h-1.5" />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{item.progress.toFixed(1)}%</p>
                    {speedEta && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {speedEta}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {item.error && (
                <p className="text-xs text-red-500 mt-1 truncate">{item.error}</p>
              )}
            </div>
          </div>

          {/* 액션 버튼 - 하단 가로 배치 */}
          <div className="flex items-center gap-0.5 sm:gap-1 border-t border-border pt-2 -mb-1 overflow-x-auto">
            {isDone && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1 shrink-0"
                  onClick={() => setPlayerOpen(true)}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">재생</span>
                </Button>
                <a href={`/api/downloads/${item.id}/file?dl=1`} download={item.title}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1 shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">다운로드</span>
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1 shrink-0"
                  onClick={() => setDetailsOpen(true)}
                >
                  <Info className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">상세</span>
                </Button>
              </>
            )}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-orange-500 gap-1 shrink-0"
                onClick={() => onCancel(item.id)}
              >
                <X className="h-3.5 w-3.5" />
                취소
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-red-600 gap-1 shrink-0"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">삭제</span>
            </Button>
          </div>
        </div>
      </Card>

      <VideoPlayerDialog item={item} open={playerOpen} onClose={() => setPlayerOpen(false)} />
      <DetailsDialog item={item} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => { setDeleteOpen(false); onDelete(item.id); }}
        title={item.title || "이 항목"}
      />
    </>
  );
}

// URL 미리보기 카드
function PreviewCard({
  info,
  onDownload,
  onDownloadFirstOnly,
  format,
  quality,
  mediaType,
  isPending,
}: {
  info: PreviewInfo;
  onDownload: () => void;
  onDownloadFirstOnly: () => void;
  format: string;
  quality: string;
  mediaType: "VIDEO" | "AUDIO";
  isPending: boolean;
}) {
  const viewCountText = formatViewCount(info.viewCount || info.view_count);

  return (
    <Card className="border-[#AEC3B0]/60 bg-[#AEC3B0]/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {info.thumbnail && (
            <div className="shrink-0 rounded-md overflow-hidden bg-muted mx-auto sm:mx-0" style={{ width: 160, height: 90 }}>
              <img src={getThumbnailUrl(info.thumbnail)} alt={info.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight line-clamp-2">{info.title}</p>
            {info.uploader && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{info.uploader}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {info.isPlaylist ? (
                <Badge variant="outline" className="text-[10px] h-4 gap-1">
                  <List className="h-2.5 w-2.5" />
                  플레이리스트 {info.playlistCount ? `· ${info.playlistCount}개` : ""}
                </Badge>
              ) : (
                <>
                  {info.duration > 0 && (
                    <span className="text-xs text-muted-foreground">{formatDuration(info.duration)}</span>
                  )}
                  {viewCountText && (
                    <span className="text-xs text-muted-foreground">{viewCountText}</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {info.isPlaylist ? (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1 bg-[#598392] hover:bg-[#4a7280] text-white h-9"
              onClick={onDownload}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
              전체 다운로드
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9"
              onClick={onDownloadFirstOnly}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Video className="h-3.5 w-3.5 mr-1.5" />}
              첫 번째만
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="w-full mt-3 bg-[#598392] hover:bg-[#4a7280] text-white h-9"
            onClick={onDownload}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            다운로드 ({format.toUpperCase()} · {mediaType === "VIDEO" ? quality : "오디오"})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// URL 유효성 간단 체크
function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function HomeClient() {
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState<"VIDEO" | "AUDIO">("VIDEO");
  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("best");
  const [activeTab, setActiveTab] = useState("home");
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: downloadList = [] } = useQuery<DownloadItem[]>({
    queryKey: ["downloads"],
    queryFn: () => axios.get("/api/downloads").then(r => r.data),
    refetchInterval: false,
  });

  // SSE: 진행 중인 다운로드의 진행률을 실시간으로 받아옴
  useEffect(() => {
    const activeIds = downloadList
      .filter(d => ["PENDING", "DOWNLOADING", "PROCESSING"].includes(d.status))
      .map(d => d.id);

    if (activeIds.length === 0) return;

    const sources = activeIds.map(id => {
      const es = new EventSource(`/api/downloads/${id}/progress`);
      es.onmessage = (e) => {
        try {
          const update = JSON.parse(e.data);
          queryClient.setQueryData<DownloadItem[]>(["downloads"], (old = []) =>
            old.map(d => d.id === id ? { ...d, ...update } : d)
          );
          if (update.status === "DONE" || update.status === "ERROR") {
            es.close();
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => es.close();
      return es;
    });

    return () => sources.forEach(es => es.close());
  }, [downloadList.map(d => d.id + d.status).join(","), queryClient]);

  const createDownload = useMutation({
    mutationFn: (data: object) => axios.post("/api/downloads", data).then(r => r.data),
    onSuccess: (newDownload) => {
      queryClient.setQueryData<DownloadItem[]>(["downloads"], (old = []) => [newDownload, ...old]);
      setUrl("");
      setPreviewInfo(null);
      setPreviewError(null);
    },
  });

  const deleteDownload = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/downloads/${id}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["downloads"] }),
  });

  const cancelDownload = useMutation({
    mutationFn: (id: string) => axios.patch(`/api/downloads/${id}`, { action: "cancel" }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["downloads"] }),
  });

  const handleTypeChange = (type: "VIDEO" | "AUDIO") => {
    setMediaType(type);
    setFormat(type === "VIDEO" ? "mp4" : "mp3");
  };

  const handlePreview = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim() || !isValidUrl(targetUrl.trim())) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewInfo(null);
    try {
      const res = await axios.post("/api/downloads/info", { url: targetUrl.trim() });
      setPreviewInfo(res.data);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "정보를 가져올 수 없습니다.";
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (previewInfo) setPreviewInfo(null);
    if (previewError) setPreviewError(null);

    // URL이 유효하면 자동으로 정보 확인 (디바운스 800ms)
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (isValidUrl(value.trim())) {
      previewTimerRef.current = setTimeout(() => {
        handlePreview(value);
      }, 800);
    }
  };

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const handleDownload = () => {
    if (!url.trim()) return;
    createDownload.mutate({ url: url.trim(), format, quality, type: mediaType });
  };

  const handleDownloadFirstOnly = () => {
    if (!url.trim()) return;
    createDownload.mutate({ url: url.trim(), format, quality, type: mediaType, noPlaylist: true });
  };

  const handleDownloadPlaylist = () => {
    if (!url.trim()) return;
    createDownload.mutate({ url: url.trim(), format, quality, type: mediaType, noPlaylist: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (previewInfo) {
      handleDownload();
    } else {
      handlePreview(url);
    }
  };

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const activeDownloads = downloadList.filter(d => ["PENDING", "DOWNLOADING", "PROCESSING"].includes(d.status));
  const completedDownloads = downloadList.filter(d => d.status === "DONE");
  const errorDownloads = downloadList.filter(d => d.status === "ERROR");
  const formats = mediaType === "VIDEO" ? VIDEO_FORMATS : AUDIO_FORMATS;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Hero */}
      <div className="text-center py-3 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">동영상 다운로드</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          YouTube, Twitter, Instagram 등 다양한 플랫폼의 영상을 다운로드하세요
        </p>
      </div>

      {/* Download Form */}
      <Card className="shadow-md border-[#AEC3B0]/40">
        <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="URL을 입력하세요..."
                  value={url}
                  onChange={e => handleUrlChange(e.target.value)}
                  className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
              <Button
                type="submit"
                className="h-11 sm:h-12 px-4 sm:px-6 bg-[#598392] hover:bg-[#4a7280] text-white shrink-0"
                disabled={!url.trim() || createDownload.isPending || previewLoading}
              >
                {createDownload.isPending || previewLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />
                }
                <span className="ml-1.5 hidden sm:inline">다운로드</span>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 pt-1">
              {/* Type */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleTypeChange("VIDEO")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium transition-colors",
                    mediaType === "VIDEO" ? "bg-[#598392] text-white" : "bg-background text-foreground hover:bg-muted"
                  )}
                >
                  <Video className="h-3.5 w-3.5" />
                  영상
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("AUDIO")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium transition-colors",
                    mediaType === "AUDIO" ? "bg-[#598392] text-white" : "bg-background text-foreground hover:bg-muted"
                  )}
                >
                  <Music className="h-3.5 w-3.5" />
                  오디오
                </button>
              </div>

              {/* Format */}
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-24 sm:w-28 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formats.map(f => (
                    <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Quality */}
              {mediaType === "VIDEO" && (
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger className="w-28 sm:w-36 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_OPTIONS.map(q => (
                      <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview loading indicator */}
      {previewLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          영상 정보를 가져오는 중...
        </div>
      )}

      {/* Preview Card */}
      {previewError && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {previewError}
        </div>
      )}

      {previewInfo && (
        <PreviewCard
          info={previewInfo}
          onDownload={previewInfo.isPlaylist ? handleDownloadPlaylist : handleDownload}
          onDownloadFirstOnly={handleDownloadFirstOnly}
          format={format}
          quality={quality}
          mediaType={mediaType}
          isPending={createDownload.isPending}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "진행 중", count: activeDownloads.length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "완료", count: completedDownloads.length, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "오류", count: errorDownloads.length, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
        ].map(stat => (
          <Card key={stat.label} className={cn("text-center p-3 sm:p-4", stat.bg)}>
            <p className={cn("text-xl sm:text-2xl font-bold", stat.color)}>{stat.count}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Download List */}
      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); }}>
        <TabsList className="w-full">
          <TabsTrigger value="home" className="flex-1 text-xs sm:text-sm">전체 ({downloadList.length})</TabsTrigger>
          <TabsTrigger value="active" className="flex-1 text-xs sm:text-sm">진행 중 ({activeDownloads.length})</TabsTrigger>
          <TabsTrigger value="done" className="flex-1 text-xs sm:text-sm">완료 ({completedDownloads.length})</TabsTrigger>
        </TabsList>

        {(["home", "active", "done"] as const).map(tab => {
          const allItems = tab === "home" ? downloadList : tab === "active" ? activeDownloads : completedDownloads;
          const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
          const currentPage = Math.min(page, totalPages);
          const items = allItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

          return (
            <TabsContent key={tab} value={tab} className="space-y-2 sm:space-y-3 mt-3 sm:mt-4">
              {allItems.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-muted-foreground">
                  <Download className="h-10 sm:h-12 w-10 sm:w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-sm sm:text-base">다운로드 항목이 없습니다</p>
                  <p className="text-xs sm:text-sm mt-1">URL을 입력하여 다운로드를 시작하세요</p>
                </div>
              ) : (
                <>
                  {items.map(item => (
                    <DownloadCard
                      key={item.id}
                      item={item}
                      onDelete={(id) => deleteDownload.mutate(id)}
                      onCancel={(id) => cancelDownload.mutate(id)}
                    />
                  ))}

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 pt-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <Button
                          key={p}
                          variant={p === currentPage ? "default" : "outline"}
                          size="icon"
                          className={cn(
                            "h-8 w-8 text-xs",
                            p === currentPage && "bg-[#598392] hover:bg-[#4a7280] text-white"
                          )}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
