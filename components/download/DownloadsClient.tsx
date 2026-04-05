"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Download, Search, Grid, List, Trash2, Play, Video, Music,
  Filter, X, Info, Clock, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, FileVideo, HardDrive, Calendar, Hash, Maximize2, Zap,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatFileSize, formatDuration, getStatusLabel, getThumbnailUrl } from "@/lib/utils";
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
    <Badge variant={config.variant} className="gap-1 text-[10px] h-4">
      <Icon className={cn("h-3 w-3", status === "DOWNLOADING" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

// 썸네일 + 호버 프리뷰
function ThumbnailPreview({ item, onClick, className, style }: {
  item: DownloadItem;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);
  const isDoneVideo = item.status === "DONE" && item.type === "VIDEO";
  const isDoneAudio = item.status === "DONE" && item.type === "AUDIO";

  return (
    <div
      className={cn(
        "relative rounded-md overflow-hidden bg-muted flex items-center justify-center transition-all duration-200",
        (isDoneVideo || isDoneAudio) && "cursor-pointer",
        isDoneVideo && "hover:ring-2 hover:ring-[#598392]",
        className
      )}
      style={style}
      onMouseEnter={() => {
        if (!isDoneVideo) return;
        setHovered(true);
        if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}); }
      }}
      onMouseLeave={() => {
        if (!isDoneVideo) return;
        setHovered(false);
        if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
      }}
      onClick={(isDoneVideo || isDoneAudio) ? onClick : undefined}
    >
      {item.thumbnail ? (
        <img src={getThumbnailUrl(item.thumbnail, item.id)} alt={item.title} className={cn("w-full h-full object-cover transition-opacity duration-200", hovered && isDoneVideo ? "opacity-0" : "opacity-100")} />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {item.type === "AUDIO" ? <Music className="h-6 w-6 text-muted-foreground" /> : <Video className="h-6 w-6 text-muted-foreground" />}
        </div>
      )}
      {isDoneVideo && (
        <video ref={videoRef} src={`/api/downloads/${item.id}/file`} muted loop playsInline preload="none"
          className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-200", hovered ? "opacity-100" : "opacity-0")} />
      )}
      {(isDoneVideo || isDoneAudio) && (
        <div className={cn("absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200", hovered || isDoneAudio ? "opacity-100" : "opacity-0")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
            <Play className="h-4 w-4 text-black ml-0.5" fill="black" />
          </div>
        </div>
      )}
    </div>
  );
}

// 재생 모달
function VideoPlayerDialog({ item, open, onClose }: { item: DownloadItem; open: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (!open && videoRef.current) videoRef.current.pause(); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
        <div className="relative">
          <button onClick={onClose} className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <X className="h-4 w-4" />
          </button>
          {item.type === "VIDEO" ? (
            <video ref={videoRef} src={`/api/downloads/${item.id}/file`} controls autoPlay className="w-full max-h-[80vh]" style={{ display: "block" }} />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 gap-4">
              <Music className="h-16 w-16 text-white/60" />
              <p className="text-white font-medium text-base text-center">{item.title}</p>
              <audio src={`/api/downloads/${item.id}/file`} controls autoPlay className="w-full mt-2" />
            </div>
          )}
          <div className="px-4 py-3 bg-black/80">
            <p className="text-white text-sm font-medium truncate">{item.title}</p>
            <p className="text-white/50 text-xs mt-0.5">
              {item.format.toUpperCase()} · {item.width && item.height ? `${item.width}×${item.height}` : item.quality}
              {item.duration ? ` · ${formatDuration(item.duration)}` : ""}
              {item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ""}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 상세 모달
function DetailsDialog({ item, open, onClose }: { item: DownloadItem; open: boolean; onClose: () => void }) {
  const filename = item.filePath?.split("/").pop();
  const resolution = item.width && item.height ? `${item.width} × ${item.height}` : item.quality !== "best" ? item.quality : null;
  const rows = [
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
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Info className="h-4 w-4 text-[#598392]" />상세 정보</DialogTitle></DialogHeader>
        {item.thumbnail && <div className="rounded-lg overflow-hidden aspect-video bg-muted"><img src={getThumbnailUrl(item.thumbnail, item.id)} alt={item.title} className="w-full h-full object-cover" /></div>}
        <p className="font-medium text-sm leading-tight">{item.title}</p>
        <div className="space-y-2.5 mt-1">{rows.map(r => (
          <div key={r.label} className="flex items-start gap-3"><span className="text-muted-foreground mt-0.5 shrink-0">{r.icon}</span><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{r.label}</p><p className="text-sm font-medium break-all">{r.value}</p></div></div>
        ))}</div>
        {item.filePath && <div className="rounded-md bg-muted px-3 py-2"><p className="text-xs text-muted-foreground mb-1">저장 경로</p><p className="text-xs font-mono break-all">{item.filePath}</p></div>}
      </DialogContent>
    </Dialog>
  );
}

// 삭제 확인
function DeleteConfirmDialog({ open, onClose, onConfirm, title }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Trash2 className="h-4 w-4 text-red-500" />삭제 확인</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">&ldquo;{title}&rdquo;을(를) 정말 삭제하시겠습니까?</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">취소</Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1 sm:flex-none">삭제</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ITEMS_PER_PAGE = 12;

export function DownloadsClient() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [playerItem, setPlayerItem] = useState<DownloadItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<DownloadItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DownloadItem | null>(null);
  const queryClient = useQueryClient();

  const { data: downloads = [], isLoading } = useQuery<DownloadItem[]>({
    queryKey: ["downloads"],
    queryFn: () => axios.get("/api/downloads").then(r => r.data),
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/downloads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["downloads"] }),
  });

  const allFiltered = downloads.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.url.includes(search);
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchType = typeFilter === "all" || d.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(allFiltered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const filtered = allFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#598392] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="검색..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
        </div>

        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-28 sm:w-36 h-9"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="DONE">완료</SelectItem>
            <SelectItem value="DOWNLOADING">다운로드 중</SelectItem>
            <SelectItem value="PENDING">대기 중</SelectItem>
            <SelectItem value="ERROR">오류</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-24 sm:w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="VIDEO">영상</SelectItem>
            <SelectItem value="AUDIO">오디오</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex rounded-md border border-border overflow-hidden">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setViewMode("grid")}><Grid className="h-4 w-4" /></Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{allFiltered.length}개 항목</p>

      {allFiltered.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-muted-foreground">
          <Download className="h-12 w-12 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">다운로드 항목이 없습니다</p>
          <p className="text-sm mt-1">홈에서 URL을 입력해 다운로드를 시작하세요</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filtered.map(item => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <div className="p-3 sm:p-4 space-y-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="shrink-0 block sm:hidden">
                    <ThumbnailPreview item={item} onClick={() => setPlayerItem(item)} style={{ width: 100, height: 56 }} />
                  </div>
                  <div className="shrink-0 hidden sm:block">
                    <ThumbnailPreview item={item} onClick={() => setPlayerItem(item)} style={{ width: 140, height: 79 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("font-medium text-sm truncate flex-1", item.status === "DONE" && "cursor-pointer hover:text-[#598392]")}
                        onClick={item.status === "DONE" ? () => setPlayerItem(item) : undefined}>
                        {item.title || item.url}
                      </p>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex gap-2 mt-1 items-center flex-wrap">
                      <Badge variant="brand-sub" className="text-[10px] h-4">{item.format.toUpperCase()}</Badge>
                      {item.width && item.height
                        ? <span className="text-xs text-muted-foreground">{item.width}×{item.height}</span>
                        : <span className="text-xs text-muted-foreground">{item.quality}</span>}
                      {item.duration && <span className="text-xs text-muted-foreground">{formatDuration(item.duration)}</span>}
                      {item.fileSize && <span className="text-xs text-muted-foreground">{formatFileSize(item.fileSize)}</span>}
                    </div>
                    {["DOWNLOADING", "PROCESSING"].includes(item.status) && (
                      <div className="mt-1.5">
                        <Progress value={item.progress} animated className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-0.5">{item.progress.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* 액션 */}
                <div className="flex items-center gap-0.5 sm:gap-1 border-t border-border pt-2 -mb-1">
                  {item.status === "DONE" && (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1" onClick={() => setPlayerItem(item)}>
                        <Play className="h-3.5 w-3.5" /><span className="hidden sm:inline">재생</span>
                      </Button>
                      <a href={`/api/downloads/${item.id}/file?dl=1`} download={item.title}>
                        <Button variant="ghost" size="sm" className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1">
                          <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">다운로드</span>
                        </Button>
                      </a>
                      <Button variant="ghost" size="sm" className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1" onClick={() => setDetailsItem(item)}>
                        <Info className="h-3.5 w-3.5" /><span className="hidden sm:inline">상세</span>
                      </Button>
                    </>
                  )}
                  <div className="flex-1" />
                  <Button variant="ghost" size="sm" className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-red-600 gap-1" onClick={() => setDeleteTarget(item)}>
                    <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">삭제</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow group">
              <ThumbnailPreview item={item} onClick={() => setPlayerItem(item)} className="aspect-video w-full" />
              <CardContent className="p-2.5 sm:p-3">
                <p className={cn("text-xs sm:text-sm font-medium truncate", item.status === "DONE" && "cursor-pointer hover:text-[#598392]")}
                  onClick={item.status === "DONE" ? () => setPlayerItem(item) : undefined}>
                  {item.title || item.url}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <StatusBadge status={item.status} />
                  <span className="text-[10px] text-muted-foreground">{item.format.toUpperCase()}</span>
                  {item.width && item.height
                    ? <span className="text-[10px] text-muted-foreground">{item.width}×{item.height}</span>
                    : null}
                </div>
                {["DOWNLOADING", "PROCESSING"].includes(item.status) && (
                  <Progress value={item.progress} animated className="h-1 mt-2" />
                )}
                <div className="flex items-center gap-1 mt-2 -mb-0.5">
                  {item.status === "DONE" && (
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-[#598392] gap-0.5" onClick={() => setDetailsItem(item)}>
                      <Info className="h-3 w-3" />상세
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-red-600 gap-0.5" onClick={() => setDeleteTarget(item)}>
                    <Trash2 className="h-3 w-3" />삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Button key={p} variant={p === currentPage ? "default" : "outline"} size="icon"
              className={cn("h-8 w-8 text-xs", p === currentPage && "bg-[#598392] hover:bg-[#4a7280] text-white")}
              onClick={() => setPage(p)}>{p}</Button>
          ))}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 모달들 */}
      {playerItem && <VideoPlayerDialog item={playerItem} open={!!playerItem} onClose={() => setPlayerItem(null)} />}
      {detailsItem && <DetailsDialog item={detailsItem} open={!!detailsItem} onClose={() => setDetailsItem(null)} />}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title={deleteTarget?.title || "이 항목"}
      />
    </div>
  );
}
