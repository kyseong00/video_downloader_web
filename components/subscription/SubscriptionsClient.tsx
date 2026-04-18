"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Rss, Plus, Trash2, Loader2, Video, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

interface Subscription {
  id: string;
  channelId: string;
  channelName: string;
  channelThumb?: string;
  channelUrl: string;
  isActive: boolean;
  format: string;
  quality: string;
  lastChecked: string;
}

export function SubscriptionsClient() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Subscription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [form, setForm] = useState({ url: "", format: "mp4", quality: "best" });
  const queryClient = useQueryClient();

  const { data: subs = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["subscriptions"],
    queryFn: () => axios.get("/api/subscriptions").then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (data: object) => axios.post("/api/subscriptions", data).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subscriptions"] }); setOpen(false); setForm({ url: "", format: "mp4", quality: "best" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteFiles }: { id: string; deleteFiles: boolean }) =>
      axios.delete(`/api/subscriptions/${id}${deleteFiles ? "?deleteFiles=1" : ""}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      axios.patch(`/api/subscriptions/${id}`, { isActive }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
  });

  const checkMutation = useMutation({
    mutationFn: (id?: string) =>
      axios.post("/api/subscriptions/check", id ? { id } : {}).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
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
          <h2 className="text-lg font-semibold">{t("subscription.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("subscription.headingDesc")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkMutation.mutate(undefined)}
            disabled={checkMutation.isPending || subs.filter(s => s.isActive).length === 0}
            title={t("subscription.checkAllTitle")}
            className="flex-1 sm:flex-none"
          >
            {checkMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
              : <RefreshCw className="h-4 w-4 mr-1" />
            }
            {t("subscription.checkAll")}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#598392] hover:bg-[#4a7280] text-white flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-1" /> {t("subscription.addChannel")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("subscription.addDialogTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); addMutation.mutate(form); }} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>{t("subscription.channelUrl")}</Label>
                <Input
                  placeholder="https://youtube.com/@channel"
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("subscription.format")}</Label>
                  <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["mp4", "webm", "mp3", "m4a"].map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("subscription.quality")}</Label>
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
                <Button type="submit" className="flex-1 bg-[#598392] hover:bg-[#4a7280] text-white" disabled={addMutation.isPending}>
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("subscription.addButton")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Rss className="h-14 w-14 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">{t("subscription.empty")}</p>
          <p className="text-sm mt-1">{t("subscription.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map(sub => (
            <Card key={sub.id} className="hover:shadow-sm transition-shadow">
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {sub.channelThumb
                      ? <img src={sub.channelThumb} alt="" className="w-full h-full object-cover" />
                      : <Video className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{sub.channelName}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      <Badge variant="brand-sub" className="text-[10px] h-4">{sub.format.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">{sub.quality}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {t("subscription.lastChecked")}: {new Date(sub.lastChecked).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}
                      </span>
                    </div>
                  </div>
                  {/* 데스크톱 액션 */}
                  <div className="hidden sm:flex items-center gap-3 shrink-0">
                    <Switch
                      checked={sub.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: sub.id, isActive: checked })}
                    />
                    <span className="text-xs text-muted-foreground w-10">{sub.isActive ? t("subscription.active") : t("subscription.inactive")}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-[#598392]"
                      onClick={() => setDetailTarget(sub)}
                      title={t("subscription.viewDetails")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-[#598392]"
                      onClick={() => checkMutation.mutate(sub.id)}
                      disabled={checkMutation.isPending || !sub.isActive}
                      title={t("subscription.checkNewVideos")}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checkMutation.isPending ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      onClick={() => setDeleteTarget({ id: sub.id, name: sub.channelName })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {/* 모바일 액션 */}
                <div className="flex sm:hidden items-center gap-2 border-t border-border pt-2">
                  <Switch
                    checked={sub.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: sub.id, isActive: checked })}
                  />
                  <span className="text-xs text-muted-foreground">{sub.isActive ? t("subscription.active") : t("subscription.inactive")}</span>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392]"
                    onClick={() => setDetailTarget(sub)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    {t("subscription.details")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-[#598392]"
                    onClick={() => checkMutation.mutate(sub.id)}
                    disabled={checkMutation.isPending || !sub.isActive}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${checkMutation.isPending ? "animate-spin" : ""}`} />
                    {t("subscription.check")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500"
                    onClick={() => setDeleteTarget({ id: sub.id, name: sub.channelName })}
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
              <Rss className="h-4 w-4 text-[#598392]" />
              {t("subscription.details")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {detailTarget?.channelThumb
                  ? <img src={detailTarget.channelThumb} alt="" className="w-full h-full object-cover" />
                  : <Video className="h-5 w-5 text-muted-foreground" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs mb-0.5">{t("subscription.channelName")}</p>
                <p className="font-medium truncate">{detailTarget?.channelName}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">{t("subscription.channelUrl")}</p>
              <a
                href={detailTarget?.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#598392] hover:underline break-all flex items-center gap-1"
              >
                {detailTarget?.channelUrl}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground mb-1">{t("subscription.format")}</p>
                <Badge variant="brand-sub">{detailTarget?.format.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">{t("subscription.quality")}</p>
                <p className="font-medium">{detailTarget?.quality}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">{t("subscription.lastChecked")}</p>
              <p className="font-medium">
                {detailTarget?.lastChecked
                  ? new Date(detailTarget.lastChecked).toLocaleString(i18n.language === "ko" ? "ko-KR" : "en-US")
                  : "-"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)} className="w-full">{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteFiles(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4 text-red-500" />
              {t("subscription.deleteTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("subscription.deleteMessage", { name: deleteTarget?.name ?? "" })}
          </p>
          <label className="flex items-start gap-2 text-sm cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={deleteFiles}
              onChange={(e) => setDeleteFiles(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#598392] cursor-pointer"
            />
            <span>{t("subscription.deleteFilesAlso")}</span>
          </label>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteFiles(false); }} className="flex-1 sm:flex-none">{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              className="flex-1 sm:flex-none"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id, deleteFiles });
                setDeleteTarget(null);
                setDeleteFiles(false);
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
