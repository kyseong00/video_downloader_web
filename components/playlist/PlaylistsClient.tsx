"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ListMusic, Plus, Trash2, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

interface Playlist {
  id: string;
  name: string;
  playlistUrl: string;
  format: string;
  quality: string;
  isActive: boolean;
  lastChecked: string;
  createdAt: string;
  _count?: { items: number };
}

export function PlaylistsClient() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Playlist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", playlistUrl: "", format: "mp4", quality: "best" });
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading } = useQuery<Playlist[]>({
    queryKey: ["playlists"],
    queryFn: () => axios.get("/api/playlists").then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => axios.post("/api/playlists", data).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["playlists"] }); setOpen(false); setForm({ name: "", playlistUrl: "", format: "mp4", quality: "best" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/playlists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      axios.patch(`/api/playlists/${id}`, { isActive }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] }),
  });

  const checkMutation = useMutation({
    mutationFn: (id?: string) =>
      axios.post("/api/playlists/check", id ? { id } : {}).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#598392] border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("playlist.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("playlist.headingDesc")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkMutation.mutate(undefined)}
            disabled={checkMutation.isPending || playlists.filter(p => p.isActive).length === 0}
            title={t("playlist.checkAllTitle")}
            className="flex-1 sm:flex-none"
          >
            {checkMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
              : <RefreshCw className="h-4 w-4 mr-1" />
            }
            {t("playlist.checkAll")}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#598392] hover:bg-[#4a7280] text-white flex-1 sm:flex-none">
                <Plus className="h-4 w-4 mr-1" /> {t("playlist.addPlaylist")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("playlist.addDialogTitle")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>{t("playlist.name")}</Label>
                  <Input
                    placeholder={t("playlist.playlistName")}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("playlist.playlistUrl")}</Label>
                  <Input
                    placeholder="https://youtube.com/playlist?list=..."
                    value={form.playlistUrl}
                    onChange={e => setForm({ ...form, playlistUrl: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("playlist.format")}</Label>
                    <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["mp4", "webm", "mp3", "m4a"].map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("playlist.quality")}</Label>
                    <Select value={form.quality} onValueChange={v => setForm({ ...form, quality: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["best", "1080p", "720p", "480p"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" className="flex-1 bg-[#598392] hover:bg-[#4a7280] text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("playlist.addButton")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListMusic className="h-14 w-14 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">{t("playlist.empty")}</p>
          <p className="text-sm mt-1">{t("playlist.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map(pl => (
            <Card key={pl.id} className="hover:shadow-sm transition-shadow">
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#AEC3B0]/30 flex items-center justify-center shrink-0">
                    <ListMusic className="h-5 w-5 sm:h-6 sm:w-6 text-[#598392]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{pl.name}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      <Badge variant="brand-sub" className="text-[10px] h-4">{pl.format.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">{pl.quality}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {t("playlist.lastChecked")}: {new Date(pl.lastChecked).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}
                      </span>
                    </div>
                  </div>
                  {/* 데스크톱 액션 */}
                  <div className="hidden sm:flex items-center gap-3 shrink-0">
                    <Switch
                      checked={pl.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: pl.id, isActive: checked })}
                    />
                    <span className="text-xs text-muted-foreground w-10">{pl.isActive ? t("playlist.active") : t("playlist.inactive")}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-[#598392]"
                      onClick={() => setDetailTarget(pl)}
                      title={t("playlist.viewDetails")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-[#598392]"
                      onClick={() => checkMutation.mutate(pl.id)}
                      disabled={checkMutation.isPending || !pl.isActive}
                      title={t("playlist.checkNewVideos")}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checkMutation.isPending ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      onClick={() => setDeleteTarget({ id: pl.id, name: pl.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {/* 모바일 액션 */}
                <div className="flex sm:hidden items-center gap-2 border-t border-border pt-2">
                  <Switch
                    checked={pl.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: pl.id, isActive: checked })}
                  />
                  <span className="text-xs text-muted-foreground">{pl.isActive ? t("playlist.active") : t("playlist.inactive")}</span>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392]"
                    onClick={() => setDetailTarget(pl)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    {t("playlist.details")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392]"
                    onClick={() => checkMutation.mutate(pl.id)}
                    disabled={checkMutation.isPending || !pl.isActive}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${checkMutation.isPending ? "animate-spin" : ""}`} />
                    {t("playlist.check")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500"
                    onClick={() => setDeleteTarget({ id: pl.id, name: pl.name })}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* 상세보기 다이얼로그 */}
      <Dialog open={!!detailTarget} onOpenChange={() => setDetailTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ListMusic className="h-4 w-4 text-[#598392]" />
              {t("playlist.details")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">{t("playlist.name")}</p>
              <p className="font-medium">{detailTarget?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">{t("playlist.playlistUrl")}</p>
              <a
                href={detailTarget?.playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#598392] hover:underline break-all flex items-center gap-1"
              >
                {detailTarget?.playlistUrl}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground mb-1">{t("playlist.format")}</p>
                <Badge variant="brand-sub">{detailTarget?.format.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">{t("playlist.quality")}</p>
                <p className="font-medium">{detailTarget?.quality}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)} className="w-full">{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4 text-red-500" />
              {t("playlist.deleteTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("playlist.deleteMessage", { name: deleteTarget?.name ?? "" })}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 sm:flex-none">{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              className="flex-1 sm:flex-none"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
