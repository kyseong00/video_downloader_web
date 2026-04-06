"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Shield, Users, Download, HardDrive, Activity, CheckCircle2,
  AlertCircle, Clock, Trash2, ChevronDown, UserCog, UserCheck, UserX,
  FileVideo, FileAudio, Eye, X, Check, Search, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatFileSize, formatDuration } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Stats {
  totalUsers: number;
  totalDownloads: number;
  activeDownloads: number;
  completedDownloads: number;
  errorDownloads: number;
  totalSize: number;
  userStorage: { id: string; name: string; size: number }[];
}

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  status: "PENDING" | "APPROVED";
  createdAt: string;
  downloadCount: number;
}

interface DownloadItem {
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
  createdAt: string;
}

export function AdminClient() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [downloadsUser, setDownloadsUser] = useState<User | null>(null);
  const [selectedDownloads, setSelectedDownloads] = useState<Set<string>>(new Set());
  const [dlSearch, setDlSearch] = useState("");
  const [dlStatusFilter, setDlStatusFilter] = useState("all");

  const { data: stats } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => axios.get("/api/admin/stats").then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: userList = [] } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => axios.get("/api/admin/users").then(r => r.data),
  });

  const { data: userDownloads = [], isLoading: downloadsLoading } = useQuery<DownloadItem[]>({
    queryKey: ["admin-user-downloads", downloadsUser?.id],
    queryFn: () => axios.get(`/api/admin/downloads?userId=${downloadsUser!.id}`).then(r => r.data),
    enabled: !!downloadsUser,
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      axios.patch("/api/admin/users", { id, role }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedUser(null);
    },
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "PENDING" }) =>
      axios.patch("/api/admin/users", { id, status }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/admin/users?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedUser(null);
    },
  });

  const deleteDownloadsMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`/api/admin/downloads?ids=${ids.join(",")}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-downloads", downloadsUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedDownloads(new Set());
    },
  });

  const s = stats ?? {
    totalUsers: 0, totalDownloads: 0, activeDownloads: 0,
    completedDownloads: 0, errorDownloads: 0, totalSize: 0,
    userStorage: [],
  };

  const pendingUsers = userList.filter(u => u.status === "PENDING");
  const approvedUsers = userList.filter(u => u.status === "APPROVED");

  // 다운로드 다이얼로그 필터링
  const filteredDownloads = useMemo(() => {
    return userDownloads.filter(d => {
      const matchSearch = d.title.toLowerCase().includes(dlSearch.toLowerCase());
      const matchStatus = dlStatusFilter === "all" || d.status === dlStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [userDownloads, dlSearch, dlStatusFilter]);

  // 유저별 저장 용량 맵
  const userStorageMap = useMemo(() => {
    const map = new Map<string, number>();
    (s.userStorage || []).forEach(u => map.set(u.id, u.size));
    return map;
  }, [s.userStorage]);

  const toggleSelectDownload = (id: string) => {
    setSelectedDownloads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDownloads.size === filteredDownloads.length) {
      setSelectedDownloads(new Set());
    } else {
      setSelectedDownloads(new Set(filteredDownloads.map(d => d.id)));
    }
  };

  const cleanupErrors = () => {
    const errorIds = userDownloads.filter(d => d.status === "ERROR").map(d => d.id);
    if (errorIds.length === 0) return;
    if (confirm(t("admin.cleanupErrorsConfirm", { n: errorIds.length }))) {
      deleteDownloadsMutation.mutate(errorIds);
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

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#598392]" />
          {t("admin.dashboardTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.dashboardDesc")}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {[
          { icon: Download, label: t("admin.statsTotalDownloads"), value: s.totalDownloads, color: "text-[#598392]", bg: "bg-[#598392]/10" },
          { icon: Activity, label: t("admin.statsActive"), value: s.activeDownloads, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { icon: CheckCircle2, label: t("admin.statsCompleted"), value: s.completedDownloads, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { icon: AlertCircle, label: t("admin.statsError"), value: s.errorDownloads, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
          { icon: HardDrive, label: t("admin.statsStorage"), value: formatFileSize(s.totalSize), color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", isString: true },
          { icon: Users, label: t("admin.statsTotalUsers"), value: s.totalUsers, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={stat.bg}>
              <CardContent className="pt-3 pb-3 sm:pt-5 sm:pb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${stat.bg} shrink-0`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Storage */}
      {s.userStorage && s.userStorage.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-600" />
              {t("admin.userStorageTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {s.userStorage.map(u => {
                const pct = s.totalSize > 0 ? (u.size / s.totalSize) * 100 : 0;
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-24 truncate">{u.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">{formatFileSize(u.size)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Approval */}
      {pendingUsers.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <Clock className="h-4 w-4" />
              {t("admin.pendingTitle", { n: pendingUsers.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUsers.map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-yellow-200 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email} · {t("admin.joinedAt")} {new Date(user.createdAt).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                      onClick={() => approvalMutation.mutate({ id: user.id, status: "APPROVED" })}
                      disabled={approvalMutation.isPending}
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      {t("admin.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs px-2"
                      onClick={() => {
                        if (confirm(t("admin.rejectConfirm", { name: user.name }))) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      {t("admin.reject")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4 text-[#598392]" />
            {t("admin.users")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("admin.usersEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {approvedUsers.map(user => {
                const storage = userStorageMap.get(user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <Badge variant={user.role === "ADMIN" ? "default" : "outline"} className="text-[10px] h-4">
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {user.email} · {t("admin.downloadsCount", { n: user.downloadCount })}
                        {storage ? ` · ${formatFileSize(storage)}` : ""}
                        {" "}· {t("admin.joinedAt")} {new Date(user.createdAt).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-3">
                      {/* View Downloads Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                        onClick={() => {
                          setDownloadsUser(user);
                          setSelectedDownloads(new Set());
                          setDlSearch("");
                          setDlStatusFilter("all");
                        }}
                        title={t("admin.viewDownloads")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Dialog open={selectedUser?.id === user.id} onOpenChange={open => setSelectedUser(open ? user : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-[#598392]">
                            <UserCog className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <DialogTitle>{t("admin.userSettingsTitle", { name: user.name })}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t("admin.changeRole")}</p>
                              <Select
                                defaultValue={user.role}
                                onValueChange={role => roleChangeMutation.mutate({ id: user.id, role })}
                                disabled={roleChangeMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USER">USER</SelectItem>
                                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => {
                                if (confirm(t("admin.deleteUserConfirm", { name: user.name }))) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              {t("admin.deleteUser")}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Downloads Dialog */}
      <Dialog open={!!downloadsUser} onOpenChange={open => { if (!open) setDownloadsUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t("admin.userDownloadsTitle", { name: downloadsUser?.name })}
            </DialogTitle>
          </DialogHeader>

          {/* Search & Filter */}
          {userDownloads.length > 0 && (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("admin.searchDownloads")}
                  value={dlSearch}
                  onChange={e => setDlSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Select value={dlStatusFilter} onValueChange={setDlStatusFilter}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("adminFiles.allStatus")}</SelectItem>
                  <SelectItem value="DONE">DONE</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="DOWNLOADING">ACTIVE</SelectItem>
                </SelectContent>
              </Select>
              {userDownloads.some(d => d.status === "ERROR") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50"
                  onClick={cleanupErrors}
                  disabled={deleteDownloadsMutation.isPending}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t("admin.cleanupErrors")}
                </Button>
              )}
            </div>
          )}

          {/* Bulk Actions */}
          {filteredDownloads.length > 0 && (
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center h-5 w-5 rounded border border-border hover:border-[#598392] transition-colors"
                >
                  {selectedDownloads.size === filteredDownloads.length && filteredDownloads.length > 0 ? (
                    <Check className="h-3 w-3 text-[#598392]" />
                  ) : null}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedDownloads.size > 0
                    ? t("admin.selectedCount", { n: selectedDownloads.size })
                    : t("admin.selectAll")}
                </span>
              </div>
              {selectedDownloads.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (confirm(t("admin.deleteSelectedConfirm", { n: selectedDownloads.size }))) {
                      deleteDownloadsMutation.mutate(Array.from(selectedDownloads));
                    }
                  }}
                  disabled={deleteDownloadsMutation.isPending}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t("admin.deleteSelected")}
                </Button>
              )}
            </div>
          )}

          {/* Downloads List */}
          <div className="overflow-y-auto flex-1 space-y-1">
            {downloadsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("admin.loading")}</p>
            ) : filteredDownloads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("admin.noDownloads")}</p>
            ) : (
              filteredDownloads.map(dl => (
                <div
                  key={dl.id}
                  className="flex items-start gap-2 py-2 px-1 border-b border-border last:border-0 hover:bg-muted/50 rounded"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectDownload(dl.id)}
                    className="flex items-center justify-center h-5 w-5 mt-0.5 rounded border border-border hover:border-[#598392] transition-colors shrink-0"
                  >
                    {selectedDownloads.has(dl.id) ? (
                      <Check className="h-3 w-3 text-[#598392]" />
                    ) : null}
                  </button>

                  {/* Thumbnail */}
                  <div className="w-16 h-10 rounded overflow-hidden bg-muted shrink-0">
                    {dl.thumbnail ? (
                      <img src={dl.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {dl.type === "AUDIO" ? (
                          <FileAudio className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileVideo className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{dl.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-3.5 px-1 ${statusColor(dl.status)}`}
                      >
                        {dl.status}
                      </Badge>
                      <span>{dl.format.toUpperCase()}</span>
                      {dl.fileSize ? <span>{formatFileSize(dl.fileSize)}</span> : null}
                      {dl.duration ? <span>{formatDuration(dl.duration)}</span> : null}
                      <span>{new Date(dl.createdAt).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}</span>
                    </div>
                  </div>

                  {/* Delete single */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
                    onClick={() => {
                      if (confirm(t("admin.deleteDownloadConfirm"))) {
                        deleteDownloadsMutation.mutate([dl.id]);
                      }
                    }}
                    disabled={deleteDownloadsMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
