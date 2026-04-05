"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Settings, FolderOpen, Zap, Download, Clock, Save, Loader2, Check, Cookie, Terminal, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface UserSettings {
  downloadPath: string;
  maxConcurrent: number;
  defaultFormat: string;
  defaultQuality: string;
  pollInterval: number;
  ytdlpArgs: string;
  rateLimit: string;
  cookieContent: string;
  globalRateLimit: string;
  maxGlobalConcurrent: number;
}

export function SettingsClient({ userRole = "USER" }: { userRole?: string }) {
  const isAdmin = userRole === "ADMIN";
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteNameSaved, setSiteNameSaved] = useState(false);

  const { data: appConfig } = useQuery<{ siteName: string }>({
    queryKey: ["app-config"],
    queryFn: () => axios.get("/api/app-config").then(r => r.data),
  });

  useEffect(() => {
    if (appConfig?.siteName) setSiteName(appConfig.siteName);
  }, [appConfig]);

  const siteNameMutation = useMutation({
    mutationFn: (name: string) => axios.patch("/api/app-config", { siteName: name }).then(r => r.data),
    onSuccess: () => {
      setSiteNameSaved(true);
      setTimeout(() => setSiteNameSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
    },
  });
  const [form, setForm] = useState<UserSettings>({
    downloadPath: "./public/downloads",
    maxConcurrent: 3,
    defaultFormat: "mp4",
    defaultQuality: "best",
    pollInterval: 3600,
    ytdlpArgs: "",
    rateLimit: "",
    cookieContent: "",
    globalRateLimit: "",
    maxGlobalConcurrent: 3,
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["settings"],
    queryFn: () => axios.get("/api/settings").then(r => r.data),
  });

  useEffect(() => {
    if (settings) setForm({
      downloadPath: settings.downloadPath ?? "./public/downloads",
      maxConcurrent: settings.maxConcurrent ?? 3,
      defaultFormat: settings.defaultFormat ?? "mp4",
      defaultQuality: settings.defaultQuality ?? "best",
      pollInterval: settings.pollInterval ?? 3600,
      ytdlpArgs: settings.ytdlpArgs ?? "",
      rateLimit: settings.rateLimit ?? "",
      cookieContent: settings.cookieContent ?? "",
      globalRateLimit: settings.globalRateLimit ?? "",
      maxGlobalConcurrent: settings.maxGlobalConcurrent ?? 3,
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: object) => axios.patch("/api/settings", data).then(r => r.data),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Site Name - Admin only (separate form) */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">사이트 이름</CardTitle>
            </div>
            <CardDescription>사이드바, 로그인 페이지, 브라우저 탭에 표시되는 이름입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (siteName.trim()) siteNameMutation.mutate(siteName.trim());
              }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <Label>사이트 이름</Label>
                <Input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="video_downloader"
                  maxLength={50}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-10 bg-[#598392] hover:bg-[#4a7280] text-white"
                disabled={siteNameMutation.isPending || !siteName.trim()}
              >
                {siteNameMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : siteNameSaved
                    ? <Check className="h-4 w-4 mr-2" />
                    : <Save className="h-4 w-4 mr-2" />
                }
                {siteNameSaved ? "저장 완료! (새로고침 시 반영)" : "사이트 이름 저장"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Download Path - Admin only */}
        {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">다운로드 경로</CardTitle>
            </div>
            <CardDescription>파일이 저장될 기본 경로를 설정합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>저장 경로</Label>
              <Input
                value={form.downloadPath}
                onChange={e => setForm({ ...form, downloadPath: e.target.value })}
                placeholder="./public/downloads"
              />
            </div>
          </CardContent>
        </Card>
        )}

        {/* Download Settings - Format/Quality for all, concurrent for admin */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">다운로드 설정</CardTitle>
            </div>
            <CardDescription>{isAdmin ? "기본 포맷, 화질, 동시 다운로드 수를 설정합니다" : "기본 포맷과 화질을 설정합니다"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>기본 포맷</Label>
                <Select value={form.defaultFormat} onValueChange={v => setForm({ ...form, defaultFormat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["mp4", "webm", "mkv", "mp3", "m4a"].map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>기본 화질</Label>
                <Select value={form.defaultQuality} onValueChange={v => setForm({ ...form, defaultQuality: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["best", "1080p", "720p", "480p", "360p"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isAdmin && (
            <div className="space-y-2">
              <Label>동시 다운로드 수</Label>
              <Select value={String(form.maxConcurrent)} onValueChange={v => setForm({ ...form, maxConcurrent: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10].map(n => <SelectItem key={n} value={String(n)}>{n}개</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Global Bandwidth - Admin only */}
        {isAdmin && <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">전체 대역폭 제한</CardTitle>
            </div>
            <CardDescription>모든 다운로드에 적용되는 전체 대역폭 및 동시 다운로드 수를 제한합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>전체 동시 다운로드 수</Label>
                <Select value={String(form.maxGlobalConcurrent)} onValueChange={v => setForm({ ...form, maxGlobalConcurrent: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10, 20].map(n => <SelectItem key={n} value={String(n)}>{n}개</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">구독 자동 다운로드 시 동시 진행 수</p>
              </div>
              <div className="space-y-2">
                <Label>전체 속도 제한</Label>
                <Select
                  value={form.globalRateLimit || "none"}
                  onValueChange={v => setForm({ ...form, globalRateLimit: v === "none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="제한 없음" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">제한 없음</SelectItem>
                    <SelectItem value="500K">500 KB/s</SelectItem>
                    <SelectItem value="1M">1 MB/s</SelectItem>
                    <SelectItem value="2M">2 MB/s</SelectItem>
                    <SelectItem value="5M">5 MB/s</SelectItem>
                    <SelectItem value="10M">10 MB/s</SelectItem>
                    <SelectItem value="50M">50 MB/s</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">개별 다운로드당 속도 제한 (전체 적용)</p>
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* Subscription Settings - Admin only */}
        {isAdmin && <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">구독 설정</CardTitle>
            </div>
            <CardDescription>구독 채널 새 영상 확인 주기를 설정합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>확인 간격</Label>
              <Select value={String(form.pollInterval)} onValueChange={v => setForm({ ...form, pollInterval: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1800">30분</SelectItem>
                  <SelectItem value="3600">1시간</SelectItem>
                  <SelectItem value="7200">2시간</SelectItem>
                  <SelectItem value="21600">6시간</SelectItem>
                  <SelectItem value="86400">24시간</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>}

        {/* Cookie Settings - Admin only */}
        {isAdmin && <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">쿠키 설정</CardTitle>
            </div>
            <CardDescription>비공개 영상 다운로드 시 필요한 쿠키 (Netscape 형식)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>YouTube 쿠키</Label>
              <Textarea
                value={form.cookieContent}
                onChange={e => setForm({ ...form, cookieContent: e.target.value })}
                placeholder="# Netscape HTTP Cookie File&#10;.youtube.com	TRUE	/	TRUE	..."
                className="h-24 font-mono text-xs resize-none"
              />
              <p className="text-xs text-muted-foreground">
                브라우저 확장 프로그램으로 내보낸 cookies.txt 내용을 붙여넣으세요
              </p>
            </div>
          </CardContent>
        </Card>}

        {/* Advanced Settings - Admin only */}
        {isAdmin && <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">고급 설정</CardTitle>
            </div>
            <CardDescription>yt-dlp 추가 옵션 및 속도 제한을 설정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>추가 yt-dlp 인자</Label>
              <Input
                value={form.ytdlpArgs}
                onChange={e => setForm({ ...form, ytdlpArgs: e.target.value })}
                placeholder="--no-playlist --age-limit 18"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                공백으로 구분하여 여러 인자를 입력하세요
              </p>
            </div>
            <div className="space-y-2">
              <Label>다운로드 속도 제한</Label>
              <Select
                value={form.rateLimit || "none"}
                onValueChange={v => setForm({ ...form, rateLimit: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="제한 없음" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">제한 없음</SelectItem>
                  <SelectItem value="500K">500 KB/s</SelectItem>
                  <SelectItem value="1M">1 MB/s</SelectItem>
                  <SelectItem value="2M">2 MB/s</SelectItem>
                  <SelectItem value="5M">5 MB/s</SelectItem>
                  <SelectItem value="10M">10 MB/s</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>}

        <Button
          type="submit"
          className="w-full h-11 bg-[#598392] hover:bg-[#4a7280] text-white"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : saved
              ? <Check className="h-4 w-4 mr-2" />
              : <Save className="h-4 w-4 mr-2" />
          }
          {saved ? "저장 완료!" : "설정 저장"}
        </Button>
      </form>
    </div>
  );
}
