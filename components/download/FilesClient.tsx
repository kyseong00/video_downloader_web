"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  FolderOpen, Search, Grid, List, Trash2, Download as DownloadIcon,
  Play, Video, Music, Info, X, FileVideo, HardDrive, Calendar, Hash, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatFileSize, formatDuration, getThumbnailUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DownloadItem {
  id: string;
  title: string;
  thumbnail?: string;
  filePath?: string;
  fileSize?: number;
  duration?: number;
  format: string;
  quality: string;
  status: string;
  type: "VIDEO" | "AUDIO";
  createdAt: string;
}

function ThumbnailPreview({ item, onClick, className, style, hidePlayButton }: {
  item: DownloadItem;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  hidePlayButton?: boolean;
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
      {(isDoneVideo || isDoneAudio) && !hidePlayButton && (
        <div className={cn("absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200", hovered || isDoneAudio ? "opacity-100" : "opacity-0")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
            <Play className="h-4 w-4 text-black ml-0.5" fill="black" />
          </div>
        </div>
      )}
    </div>
  );
}

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

function DetailsDialog({ item, open, onClose }: { item: DownloadItem; open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const filename = item.filePath?.split("/").pop();
  const dateLocale = i18n.language === "ko" ? "ko-KR" : "en-US";
  const rows = [
    { icon: <FileVideo className="h-4 w-4" />, label: t("home.detailFilename"), value: filename || "-" },
    { icon: <HardDrive className="h-4 w-4" />, label: t("home.detailFileSize"), value: item.fileSize ? formatFileSize(item.fileSize) : "-" },
    { icon: <Clock className="h-4 w-4" />, label: t("home.detailDuration"), value: item.duration ? formatDuration(item.duration) : "-" },
    { icon: <Hash className="h-4 w-4" />, label: t("home.detailFormat"), value: `${item.format.toUpperCase()} · ${item.type}` },
    { icon: <Calendar className="h-4 w-4" />, label: t("home.detailDate"), value: new Date(item.createdAt).toLocaleString(dateLocale) },
  ];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Info className="h-4 w-4 text-[#598392]" />{t("home.detailsTitle")}</DialogTitle></DialogHeader>
        {item.thumbnail && <div className="rounded-lg overflow-hidden aspect-video bg-muted"><img src={getThumbnailUrl(item.thumbnail, item.id)} alt={item.title} className="w-full h-full object-cover" /></div>}
        <p className="font-medium text-sm leading-tight">{item.title}</p>
        <div className="space-y-2.5 mt-1">{rows.map(r => (
          <div key={r.label} className="flex items-start gap-3"><span className="text-muted-foreground mt-0.5 shrink-0">{r.icon}</span><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{r.label}</p><p className="text-sm font-medium break-all">{r.value}</p></div></div>
        ))}</div>
        {item.filePath && <div className="rounded-md bg-muted px-3 py-2"><p className="text-xs text-muted-foreground mb-1">{t("home.detailSavePath")}</p><p className="text-xs font-mono break-all">{item.filePath}</p></div>}
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({ open, onClose, onConfirm, title }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Trash2 className="h-4 w-4 text-red-500" />{t("home.deleteTitle")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("home.deleteMessage", { title })}</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1 sm:flex-none">{t("common.delete")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FilesClient() {
  const { t, i18n } = useTranslation();
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("viewMode_files") as "grid" | "list") || "grid";
    }
    return "grid";
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [playerItem, setPlayerItem] = useState<DownloadItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<DownloadItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DownloadItem | null>(null);
  const queryClient = useQueryClient();

  const { data: allDownloads = [], isLoading } = useQuery<DownloadItem[]>({
    queryKey: ["downloads"],
    queryFn: () => axios.get("/api/downloads").then(r => r.data),
  });

  const files = allDownloads.filter(d => d.status === "DONE");

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/downloads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["downloads"] }),
  });

  const filtered = files.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || f.type === typeFilter;
    return matchSearch && matchType;
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#598392] border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("files.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("files.typeAll")}</SelectItem>
            <SelectItem value="VIDEO">{t("files.typeVideo")}</SelectItem>
            <SelectItem value="AUDIO">{t("files.typeAudio")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md border border-border overflow-hidden">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => { setViewMode("list"); localStorage.setItem("viewMode_files", "list"); }}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => { setViewMode("grid"); localStorage.setItem("viewMode_files", "grid"); }}>
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{t("files.countSuffix", { n: filtered.length })}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="h-14 w-14 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">{t("files.empty")}</p>
          <p className="text-sm mt-1">{t("files.emptyHint")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(file => (
            <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow group">
              <div className="relative">
                <ThumbnailPreview item={file} onClick={() => setPlayerItem(file)} className="aspect-video w-full" hidePlayButton />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 bg-white/90 hover:bg-white text-[#598392] rounded-full pointer-events-auto"
                      onClick={e => { e.stopPropagation(); setPlayerItem(file); }}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <a href={`/api/downloads/${file.id}/file?dl=1`} download onClick={e => e.stopPropagation()} className="pointer-events-auto">
                      <Button size="icon" variant="ghost" className="h-8 w-8 bg-white/90 hover:bg-white text-muted-foreground rounded-full">
                        <DownloadIcon className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7 bg-black/50 hover:bg-red-500/80 text-white rounded-full"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(file); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2.5">
                <div className="flex items-start gap-1">
                  <p className="text-xs font-medium line-clamp-2 flex-1 cursor-pointer hover:text-[#598392]"
                    onClick={() => setPlayerItem(file)}>
                    {file.title}
                  </p>
                  <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-[#598392]"
                    onClick={() => setDetailsItem(file)}>
                    <Info className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-1 mt-1">
                  <Badge variant="brand-sub" className="text-[9px] h-3.5 px-1">{file.format.toUpperCase()}</Badge>
                  {file.fileSize && <span className="text-[10px] text-muted-foreground">{formatFileSize(file.fileSize)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(file => (
            <Card key={file.id} className="hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 p-3">
                <ThumbnailPreview item={file} onClick={() => setPlayerItem(file)} style={{ width: 80, height: 56 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate cursor-pointer hover:text-[#598392]"
                    onClick={() => setPlayerItem(file)}>
                    {file.title}
                  </p>
                  <div className="flex gap-2 mt-0.5 items-center">
                    <Badge variant="brand-sub" className="text-[10px] h-4">{file.format.toUpperCase()}</Badge>
                    {file.duration && <span className="text-xs text-muted-foreground">{formatDuration(file.duration)}</span>}
                    {file.fileSize && <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>}
                    <span className="text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 border-t border-border px-3 py-1.5">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1"
                  onClick={() => setPlayerItem(file)}>
                  <Play className="h-3.5 w-3.5" />{t("files.play")}
                </Button>
                <a href={`/api/downloads/${file.id}/file?dl=1`} download>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1">
                    <DownloadIcon className="h-3.5 w-3.5" />{t("files.download")}
                  </Button>
                </a>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1"
                  onClick={() => setDetailsItem(file)}>
                  <Info className="h-3.5 w-3.5" />{t("home.details")}
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500 gap-1"
                  onClick={() => setDeleteTarget(file)}>
                  <Trash2 className="h-3.5 w-3.5" />{t("files.delete")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {playerItem && <VideoPlayerDialog item={playerItem} open={!!playerItem} onClose={() => setPlayerItem(null)} />}
      {detailsItem && <DetailsDialog item={detailsItem} open={!!detailsItem} onClose={() => setDetailsItem(null)} />}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title={deleteTarget?.title || t("home.thisItem")}
      />
    </div>
  );
}
