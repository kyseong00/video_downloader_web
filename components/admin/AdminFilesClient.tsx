"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  FolderOpen, Search, List, Grid, Trash2, FileVideo, FileAudio,
  Check, Play, Download as DownloadIcon, AlertTriangle, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function AdminFilesClient() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // 유저 목록 추출
  const userMap = new Map<string, string>();
  allDownloads.forEach(d => {
    if (d.userId && !userMap.has(d.userId)) {
      userMap.set(d.userId, d.userName || d.userEmail || d.userId);
    }
  });
  const userOptions = Array.from(userMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  // 필터
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
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={cleanupErrors}
            disabled={deleteMutation.isPending}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {t("adminFiles.cleanupErrors", { n: errorCount })}
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("adminFiles.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
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
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setViewMode("grid")}>
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center justify-center h-5 w-5 rounded border border-border hover:border-[#598392] transition-colors"
          >
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
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            onClick={() => {
              if (confirm(t("admin.deleteSelectedConfirm", { n: selectedIds.size }))) {
                deleteMutation.mutate(Array.from(selectedIds));
              }
            }}
            disabled={deleteMutation.isPending}
          >
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
              <div className="aspect-video bg-muted relative">
                {dl.thumbnail
                  ? <img src={getThumbnailUrl(dl.thumbnail, dl.id)} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      {dl.type === "AUDIO" ? <FileAudio className="h-8 w-8 text-muted-foreground" /> : <FileVideo className="h-8 w-8 text-muted-foreground" />}
                    </div>
                }
                {dl.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {formatDuration(dl.duration)}
                  </span>
                )}
                <div className="absolute top-1 left-1">
                  <Badge variant="outline" className={`text-[9px] h-3.5 px-1 bg-white/90 ${statusColor(dl.status)}`}>
                    {dl.status}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-2.5">
                <p className="text-xs font-medium truncate">{dl.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground truncate">{dl.userName}</span>
                  {dl.fileSize ? <span className="text-[10px] text-muted-foreground">· {formatFileSize(dl.fileSize)}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(dl => (
            <div
              key={dl.id}
              className="flex items-center gap-2 py-2 px-2 border-b border-border last:border-0 hover:bg-muted/50 rounded group"
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleSelect(dl.id)}
                className="flex items-center justify-center h-5 w-5 rounded border border-border hover:border-[#598392] transition-colors shrink-0"
              >
                {selectedIds.has(dl.id) ? <Check className="h-3 w-3 text-[#598392]" /> : null}
              </button>

              {/* Thumbnail */}
              <div className="w-16 h-10 rounded overflow-hidden bg-muted shrink-0">
                {dl.thumbnail ? (
                  <img src={getThumbnailUrl(dl.thumbnail, dl.id)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {dl.type === "AUDIO" ? <FileAudio className="h-4 w-4 text-muted-foreground" /> : <FileVideo className="h-4 w-4 text-muted-foreground" />}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{dl.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${statusColor(dl.status)}`}>
                    {dl.status}
                  </Badge>
                  <span className="font-medium text-[#598392]">{dl.userName}</span>
                  <span>{dl.format.toUpperCase()}</span>
                  {dl.fileSize ? <span>{formatFileSize(dl.fileSize)}</span> : null}
                  {dl.duration ? <span>{formatDuration(dl.duration)}</span> : null}
                  <span>{new Date(dl.createdAt).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {dl.status === "DONE" && dl.filePath && (
                  <>
                    <a href={`/api/downloads/${dl.id}/file`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#598392]">
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <a href={`/api/downloads/${dl.id}/file?dl=1`} download>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                        <DownloadIcon className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                  onClick={() => {
                    if (confirm(t("admin.deleteDownloadConfirm"))) {
                      deleteMutation.mutate([dl.id]);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
