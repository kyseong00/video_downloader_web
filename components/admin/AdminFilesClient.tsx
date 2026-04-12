"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  FolderOpen, Search, List, Grid, Trash2, FileVideo, FileAudio,
  Check, Play, Download as DownloadIcon, AlertTriangle, Users,
  Info, X, HardDrive, Calendar, Hash, Clock, Music
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

interface AdminDownloadItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  filePath: string | null;
  fileSize: number | null;
  duration: number | null;
  format: string;
  quality: string;
  status: string;
  type: string;
  error: string | null;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
}

function ThumbnailPreview({ item, onClick, className, style, hidePlayButton }: {
  item: AdminDownloadItem;
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
          {item.type === "AUDIO" ? <FileAudio className="h-6 w-6 text-muted-foreground" /> : <FileVideo className="h-6 w-6 text-muted-foreground" />}
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

function VideoPlayerDialog({ item, open, onClose }: { item: AdminDownloadItem; open: boolean; onClose: () => void }) {
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

function DetailsDialog({ item, open, onClose }: { item: AdminDownloadItem; open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const filename = item.filePath?.split("/").pop();
  const dateLocale = i18n.language === "ko" ? "ko-KR" : "en-US";
  const rows = [
    { icon: <FileVideo className="h-4 w-4" />, label: t("home.detailFilename"), value: filename || "-" },
    { icon: <HardDrive className="h-4 w-4" />, label: t("home.detailFileSize"), value: item.fileSize ? formatFileSize(item.fileSize) : "-" },
    { icon: <Clock className="h-4 w-4" />, label: t("home.detailDuration"), value: item.duration ? formatDuration(item.duration) : "-" },
    { icon: <Hash className="h-4 w-4" />, label: t("home.detailFormat"), value: `${item.format.toUpperCase()} · ${item.type}` },
    { icon: <Calendar className="h-4 w-4" />, label: t("home.detailDate"), value: new Date(item.createdAt).toLocaleString(dateLocale) },
    { icon: <Info className="h-4 w-4" />, label: t("adminFiles.user"), value: item.userName || item.userEmail || item.userId },
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

export function AdminFilesClient() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("viewMode_admin_files") as "list" | "grid") || "list";
    }
    return "list";
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playerItem, setPlayerItem] = useState<AdminDownloadItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<AdminDownloadItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDownloadItem | null>(null);

  const { data: allDownloads = [], isLoading } = useQuery<AdminDownloadItem[]>({
    queryKey: ["admin-all-downloads"],
    queryFn: () => axios.get("/api/admin/downloads").then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`/api/admin/downloads?ids=${ids.join(",")}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedIds(new Set());
    },
  });

  const userMap = new Map<string, string>();
  allDownloads.forEach(d => {
    if (d.userId && !userMap.has(d.userId)) {
      userMap.set(d.userId, d.userName || d.userEmail || d.userId);
    }
  });
  const userOptions = Array.from(userMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = allDownloads.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.userName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchUser = userFilter === "all" || d.userId === userFilter;
    return matchSearch && matchStatus && matchUser;
  });

  const errorCount = allDownloads.filter(d => d.status === "ERROR").length;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  };

  const cleanupErrors = () => {
    const errorIds = allDownloads.filter(d => d.status === "ERROR").map(d => d.id);
    if (errorIds.length === 0) return;
    if (confirm(t("adminFiles.cleanupErrorsConfirm", { n: errorIds.length }))) {
      deleteMutation.mutate(errorIds);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "DONE": return "text-green-600";
      case "ERROR": return "text-red-500";
      case "DOWNLOADING": return "text-blue-600";
      default: return "text-muted-foreground";
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#598392] border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#598392]" />
            {t("adminFiles.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("adminFiles.desc")}</p>
        </div>
        {errorCount > 0 && (
          <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={cleanupErrors} disabled={deleteMutation.isPending}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {t("adminFiles.cleanupErrors", { n: errorCount })}
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("adminFiles.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-36">
            <Users className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("adminFiles.allUsers")}</SelectItem>
            {userOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("adminFiles.allStatus")}</SelectItem>
            <SelectItem value="DONE">{t("adminFiles.statusDone")}</SelectItem>
            <SelectItem value="DOWNLOADING">{t("adminFiles.statusActive")}</SelectItem>
            <SelectItem value="ERROR">{t("adminFiles.statusError")}</SelectItem>
            <SelectItem value="PENDING">{t("adminFiles.statusPending")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md border border-border overflow-hidden">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => { setViewMode("list"); localStorage.setItem("viewMode_admin_files", "list"); }}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => { setViewMode("grid"); localStorage.setItem("viewMode_admin_files", "grid"); }}>
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={toggleSelectAll} className="flex items-center justify-center h-5 w-5 rounded border border-border hover:border-[#598392] transition-colors">
            {selectedIds.size === filtered.length && filtered.length > 0 ? (
              <Check className="h-3 w-3 text-[#598392]" />
            ) : null}
          </button>
          <span className="text-xs text-muted-foreground">
            {selectedIds.size > 0
              ? t("admin.selectedCount", { n: selectedIds.size })
              : t("adminFiles.countSuffix", { n: filtered.length })}
          </span>
        </div>
        {selectedIds.size > 0 && (
          <Button size="sm" variant="destructive" className="h-7 text-xs"
            onClick={() => {
              if (confirm(t("admin.deleteSelectedConfirm", { n: selectedIds.size }))) {
                deleteMutation.mutate(Array.from(selectedIds));
              }
            }}
            disabled={deleteMutation.isPending}>
            <Trash2 className="h-3 w-3 mr-1" />
            {t("admin.deleteSelected")}
          </Button>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="h-14 w-14 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">{t("adminFiles.empty")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(dl => (
            <Card
              key={dl.id}
              className={cn(
                "overflow-hidden cursor-pointer hover:shadow-md transition-all group",
                selectedIds.has(dl.id) && "ring-2 ring-[#598392]"
              )}
              onClick={() => toggleSelect(dl.id)}
            >
              <div className="relative">
                <ThumbnailPreview item={dl} onClick={() => setPlayerItem(dl)} className="aspect-video w-full" hidePlayButton />
                <div className="absolute top-1 left-1">
                  <Badge variant="outline" className={`text-[9px] h-3.5 px-1 bg-white/90 ${statusColor(dl.status)}`}>
                    {dl.status}
                  </Badge>
                </div>
                {dl.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {formatDuration(dl.duration)}
                  </span>
                )}
                {dl.status === "DONE" && dl.filePath && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 bg-white/90 hover:bg-white text-[#598392] rounded-full pointer-events-auto"
                        onClick={e => { e.stopPropagation(); setPlayerItem(dl); }}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <a href={`/api/downloads/${dl.id}/file?dl=1`} download onClick={e => e.stopPropagation()} className="pointer-events-auto">
                        <Button size="icon" variant="ghost" className="h-8 w-8 bg-white/90 hover:bg-white text-muted-foreground rounded-full">
                          <DownloadIcon className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7 bg-black/50 hover:bg-red-500/80 text-white rounded-full"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(dl); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2.5">
                <div className="flex items-start gap-1">
                  <p className="text-xs font-medium line-clamp-2 flex-1">{dl.title}</p>
                  {dl.status === "DONE" && (
                    <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-[#598392]"
                      onClick={e => { e.stopPropagation(); setDetailsItem(dl); }}>
                      <Info className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground truncate">{dl.userName}</span>
                  {dl.fileSize ? <span className="text-[10px] text-muted-foreground">· {formatFileSize(dl.fileSize)}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(dl => (
            <Card key={dl.id} className="hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 p-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(dl.id)}
                  className="flex items-center justify-center h-5 w-5 rounded border border-border hover:border-[#598392] transition-colors shrink-0"
                >
                  {selectedIds.has(dl.id) ? <Check className="h-3 w-3 text-[#598392]" /> : null}
                </button>

                {/* Thumbnail */}
                <ThumbnailPreview item={dl} onClick={() => setPlayerItem(dl)} style={{ width: 80, height: 56 }} />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate cursor-pointer hover:text-[#598392]"
                    onClick={() => dl.status === "DONE" && setPlayerItem(dl)}>
                    {dl.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${statusColor(dl.status)}`}>
                      {dl.status}
                    </Badge>
                    <Badge variant="brand-sub" className="text-[10px] h-4">{dl.format.toUpperCase()}</Badge>
                    <span className="text-xs font-medium text-[#598392]">{dl.userName}</span>
                    {dl.fileSize ? <span className="text-xs text-muted-foreground">{formatFileSize(dl.fileSize)}</span> : null}
                    {dl.duration ? <span className="text-xs text-muted-foreground">{formatDuration(dl.duration)}</span> : null}
                    <span className="text-xs text-muted-foreground">{new Date(dl.createdAt).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 border-t border-border px-3 py-1.5">
                {dl.status === "DONE" && dl.filePath && (
                  <>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1"
                      onClick={() => setPlayerItem(dl)}>
                      <Play className="h-3.5 w-3.5" />{t("home.play")}
                    </Button>
                    <a href={`/api/downloads/${dl.id}/file?dl=1`} download>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1">
                        <DownloadIcon className="h-3.5 w-3.5" />{t("home.download")}
                      </Button>
                    </a>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392] gap-1"
                      onClick={() => setDetailsItem(dl)}>
                      <Info className="h-3.5 w-3.5" />{t("home.details")}
                    </Button>
                  </>
                )}
                <div className="flex-1" />
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500 gap-1"
                  onClick={() => setDeleteTarget(dl)}
                  disabled={deleteMutation.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />{t("common.delete")}
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
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate([deleteTarget.id]); setDeleteTarget(null); }}
        title={deleteTarget?.title || t("home.thisItem")}
      />
    </div>
  );
}
