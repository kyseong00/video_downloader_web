"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FolderOpen, Search, Grid, List, Trash2, Download as DownloadIcon, Play, Video, Music, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function FilesClient() {
  const { t, i18n } = useTranslation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setViewMode("grid")}>
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
            <Card
              key={file.id}
              className={cn(
                "overflow-hidden cursor-pointer hover:shadow-md transition-all group",
                selectedId === file.id && "ring-2 ring-[#598392]"
              )}
              onClick={() => setSelectedId(selectedId === file.id ? null : file.id)}
            >
              <div className="aspect-video bg-muted relative">
                {file.thumbnail
                  ? <img src={getThumbnailUrl(file.thumbnail, file.id)} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      {file.type === "AUDIO" ? <Music className="h-8 w-8 text-muted-foreground" /> : <Video className="h-8 w-8 text-muted-foreground" />}
                    </div>
                }
                {file.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {formatDuration(file.duration)}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <a href={`/api/downloads/${file.id}/file`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 bg-white/90 hover:bg-white text-[#598392] rounded-full">
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button size="icon" variant="ghost" className="h-8 w-8 bg-white/90 hover:bg-red-50 hover:text-red-500 rounded-full"
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate(file.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-2.5">
                <p className="text-xs font-medium truncate">{file.title}</p>
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
            <Card key={file.id} className="hover:shadow-sm transition-shadow group">
              <div className="flex items-center gap-3 p-3">
                <div className="w-16 h-10 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {file.thumbnail
                    ? <img src={getThumbnailUrl(file.thumbnail, file.id)} alt="" className="w-full h-full object-cover" />
                    : file.type === "AUDIO" ? <Music className="h-4 w-4 text-muted-foreground" /> : <Video className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.title}</p>
                  <div className="flex gap-2 mt-0.5 items-center">
                    <Badge variant="brand-sub" className="text-[10px] h-4">{file.format.toUpperCase()}</Badge>
                    {file.duration && <span className="text-xs text-muted-foreground">{formatDuration(file.duration)}</span>}
                    {file.fileSize && <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>}
                    <span className="text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <a href={`/api/downloads/${file.id}/file`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#598392]" title={t("files.play")}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a href={`/api/downloads/${file.id}/file?dl=1`} download>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title={t("files.download")}>
                      <DownloadIcon className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => deleteMutation.mutate(file.id)} title={t("files.delete")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
