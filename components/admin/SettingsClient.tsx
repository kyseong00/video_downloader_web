"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Settings, FolderOpen, Zap, Download, Clock, Save, Loader2, Check, Cookie, Terminal, Type, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const isAdmin = userRole === "ADMIN";
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteNameSaved, setSiteNameSaved] = useState(false);
  const [globalRateLimitValue, setGlobalRateLimitValue] = useState("");
  const [globalRateLimitUnit, setGlobalRateLimitUnit] = useState<"K" | "M">("M");
  const [rateLimitValue, setRateLimitValue] = useState("");
  const [rateLimitUnit, setRateLimitUnit] = useState<"K" | "M">("M");

  const parseRateLimit = (rate: string) => {
    if (!rate?.trim()) return { value: "", unit: "M" as "K" | "M" };
    const match = rate.trim().match(/^(\d+(?:\.\d+)?)(K|M)$/i);
    if (!match) return { value: rate, unit: "M" as "K" | "M" };
    return { value: match[1], unit: match[2].toUpperCase() as "K" | "M" };
  };

  const buildRateLimit = (value: string, unit: string) => {
    if (!value?.trim()) return "";
    return `${value.trim()}${unit}`;
  };
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

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
    if (settings) {
      setForm({
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
      const gr = parseRateLimit(settings.globalRateLimit ?? "");
      setGlobalRateLimitValue(gr.value);
      setGlobalRateLimitUnit(gr.unit);
      const rl = parseRateLimit(settings.rateLimit ?? "");
      setRateLimitValue(rl.value);
      setRateLimitUnit(rl.unit);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: object) => axios.patch("/api/settings", data).then(r => r.data),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      axios.patch("/api/user/password", data).then(r => r.data),
    onSuccess: () => {
      setPwSaved(true);
      setPwError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSaved(false), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t("common.error");
      setPwError(msg);
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPassword.length < 6) {
      setPwError(t("settings.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t("settings.passwordMismatch"));
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      globalRateLimit: buildRateLimit(globalRateLimitValue, globalRateLimitUnit),
      rateLimit: buildRateLimit(rateLimitValue, rateLimitUnit),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Site Name - Admin only (separate form) */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">{t("settings.siteName")}</CardTitle>
            </div>
            <CardDescription>{t("settings.siteNameDesc")}</CardDescription>
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
                <Label>{t("settings.siteNameLabel")}</Label>
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
                {siteNameSaved ? t("settings.siteNameSaved") : t("settings.siteNameSaveButton")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Password Change */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#598392]" />
            <CardTitle className="text-base">{t("settings.changePassword")}</CardTitle>
          </div>
          <CardDescription>{t("settings.changePasswordDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div className="space-y-2">
              <Label>{t("settings.currentPassword")}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder={t("settings.currentPasswordPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.newPassword")}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t("settings.newPasswordPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.confirmPassword")}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t("settings.confirmPasswordPlaceholder")}
              />
            </div>
            {pwError && <p className="text-sm text-red-500">{pwError}</p>}
            <Button
              type="submit"
              className="w-full h-10 bg-[#598392] hover:bg-[#4a7280] text-white"
              disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : pwSaved
                  ? <Check className="h-4 w-4 mr-2" />
                  : <Lock className="h-4 w-4 mr-2" />
              }
              {pwSaved ? t("settings.passwordChanged") : t("settings.changePasswordButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Download Path - Admin only */}
        {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">{t("settings.downloadPath")}</CardTitle>
            </div>
            <CardDescription>{t("settings.downloadPathDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t("settings.downloadPathLabel")}</Label>
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
              <CardTitle className="text-base">{t("settings.downloadSettings")}</CardTitle>
            </div>
            <CardDescription>{isAdmin ? t("settings.downloadSettingsDescAdmin") : t("settings.downloadSettingsDescUser")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("settings.defaultFormat")}</Label>
                <Select value={form.defaultFormat} onValueChange={v => setForm({ ...form, defaultFormat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["mp4", "webm", "mkv", "mp3", "m4a"].map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.defaultQuality")}</Label>
                <Select value={form.defaultQuality} onValueChange={v => setForm({ ...form, defaultQuality: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["best", "1080p", "720p", "480p", "360p"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Bandwidth - Admin only */}
        {isAdmin && <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">{t("settings.globalBandwidth")}</CardTitle>
            </div>
            <CardDescription>{t("settings.globalBandwidthDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("settings.globalConcurrent")}</Label>
                <Select value={String(form.maxGlobalConcurrent)} onValueChange={v => setForm({ ...form, maxGlobalConcurrent: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10, 20].map(n => <SelectItem key={n} value={String(n)}>{t("common.unit.count", { n })}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("settings.globalConcurrentDesc")}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.globalRateLimit")}</Label>
                <div className="flex h-9">
                  <Input
                    type="number"
                    min={1}
                    value={globalRateLimitValue}
                    onChange={e => setGlobalRateLimitValue(e.target.value)}
                    placeholder={t("settings.rateNone")}
                    className="rounded-r-none h-full flex-1 min-w-0"
                  />
                  <div className="flex border border-l-0 rounded-r-md overflow-hidden h-full">
                    <button type="button" onClick={() => setGlobalRateLimitUnit("K")}
                      className={`px-3 text-sm font-medium h-full transition-colors ${globalRateLimitUnit === "K" ? "bg-[#598392] text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                      KB/s
                    </button>
                    <button type="button" onClick={() => setGlobalRateLimitUnit("M")}
                      className={`px-3 text-sm font-medium border-l h-full transition-colors ${globalRateLimitUnit === "M" ? "bg-[#598392] text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                      MB/s
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t("settings.globalRateLimitDesc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* Subscription Settings - Admin only */}
        {isAdmin && <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">{t("settings.subscriptionSettings")}</CardTitle>
            </div>
            <CardDescription>{t("settings.subscriptionSettingsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t("settings.checkInterval")}</Label>
              <Select value={String(form.pollInterval)} onValueChange={v => setForm({ ...form, pollInterval: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1800">{t("common.unit.minutes_30")}</SelectItem>
                  <SelectItem value="3600">{t("common.unit.hours_1")}</SelectItem>
                  <SelectItem value="7200">{t("common.unit.hours_2")}</SelectItem>
                  <SelectItem value="21600">{t("common.unit.hours_6")}</SelectItem>
                  <SelectItem value="86400">{t("common.unit.hours_24")}</SelectItem>
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
              <CardTitle className="text-base">{t("settings.cookieSettings")}</CardTitle>
            </div>
            <CardDescription>{t("settings.cookieSettingsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t("settings.cookieLabel")}</Label>
              <Textarea
                value={form.cookieContent}
                onChange={e => setForm({ ...form, cookieContent: e.target.value })}
                placeholder="# Netscape HTTP Cookie File&#10;.youtube.com	TRUE	/	TRUE	..."
                className="h-24 font-mono text-xs resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.cookieHelp")}
              </p>
            </div>
          </CardContent>
        </Card>}

        {/* Advanced Settings - Admin only */}
        {isAdmin && <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-[#598392]" />
              <CardTitle className="text-base">{t("settings.advancedSettings")}</CardTitle>
            </div>
            <CardDescription>{t("settings.advancedSettingsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("settings.ytdlpArgs")}</Label>
              <Input
                value={form.ytdlpArgs}
                onChange={e => setForm({ ...form, ytdlpArgs: e.target.value })}
                placeholder="--no-playlist --age-limit 18"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.ytdlpArgsHelp")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.downloadRateLimit")}</Label>
              <div className="flex h-9">
                <Input
                  type="number"
                  min={1}
                  value={rateLimitValue}
                  onChange={e => setRateLimitValue(e.target.value)}
                  placeholder={t("settings.rateNone")}
                  className="rounded-r-none h-full w-40"
                />
                <div className="flex border border-l-0 rounded-r-md overflow-hidden h-full">
                  <button type="button" onClick={() => setRateLimitUnit("K")}
                    className={`px-3 text-sm font-medium h-full transition-colors ${rateLimitUnit === "K" ? "bg-[#598392] text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                    KB/s
                  </button>
                  <button type="button" onClick={() => setRateLimitUnit("M")}
                    className={`px-3 text-sm font-medium border-l h-full transition-colors ${rateLimitUnit === "M" ? "bg-[#598392] text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                    MB/s
                  </button>
                </div>
              </div>
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
          {saved ? t("common.saved") : t("settings.saveButton")}
        </Button>
      </form>
    </div>
  );
}
