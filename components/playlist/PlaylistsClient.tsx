"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ListMusic, Plus, Trash2, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface Playlist {
  id: string;
  name: string;
  createdAt: string;
  _count?: { items: number };
}

export function PlaylistsClient() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading } = useQuery<Playlist[]>({
    queryKey: ["playlists"],
    queryFn: () => axios.get("/api/playlists").then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => axios.post("/api/playlists", data).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["playlists"] }); setOpen(false); setName(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/playlists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#598392] border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("playlist.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("playlist.headingDesc")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#598392] hover:bg-[#4a7280] text-white">
              <Plus className="h-4 w-4 mr-1" /> {t("playlist.newPlaylist")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("playlist.createPlaylist")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ name }); }} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>{t("playlist.name")}</Label>
                <Input placeholder={t("playlist.playlistName")} value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                <Button type="submit" className="flex-1 bg-[#598392] hover:bg-[#4a7280] text-white" disabled={createMutation.isPending}>{t("playlist.createButton")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListMusic className="h-14 w-14 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">{t("playlist.empty")}</p>
          <p className="text-sm mt-1">{t("playlist.emptyHint")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {playlists.map(pl => (
            <Card key={pl.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-[#AEC3B0]/30 flex items-center justify-center shrink-0">
                  <ListMusic className="h-6 w-6 text-[#598392]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{pl.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(pl.createdAt).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")} {t("playlist.createdSuffix")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#598392] opacity-0 group-hover:opacity-100" title={t("playlist.play")}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteMutation.mutate(pl.id)}
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
