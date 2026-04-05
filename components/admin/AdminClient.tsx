"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Shield, Users, Download, HardDrive, Activity, CheckCircle2,
  AlertCircle, Clock, Trash2, ChevronDown, UserCog, UserCheck, UserX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatFileSize } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  totalDownloads: number;
  activeDownloads: number;
  completedDownloads: number;
  errorDownloads: number;
  totalSize: number;
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

export function AdminClient() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: stats } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => axios.get("/api/admin/stats").then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: userList = [] } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => axios.get("/api/admin/users").then(r => r.data),
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

  const s = stats ?? {
    totalUsers: 0, totalDownloads: 0, activeDownloads: 0,
    completedDownloads: 0, errorDownloads: 0, totalSize: 0,
  };

  const pendingUsers = userList.filter(u => u.status === "PENDING");
  const approvedUsers = userList.filter(u => u.status === "APPROVED");

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#598392]" />
          관리자 대시보드
        </h2>
        <p className="text-sm text-muted-foreground mt-1">시스템 상태 및 사용량을 모니터링합니다</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {[
          { icon: Download, label: "전체 다운로드", value: s.totalDownloads, color: "text-[#598392]", bg: "bg-[#598392]/10" },
          { icon: Activity, label: "진행 중", value: s.activeDownloads, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { icon: CheckCircle2, label: "완료", value: s.completedDownloads, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { icon: AlertCircle, label: "오류", value: s.errorDownloads, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
          { icon: HardDrive, label: "저장 용량", value: formatFileSize(s.totalSize), color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", isString: true },
          { icon: Users, label: "사용자", value: s.totalUsers, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
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

      {/* Pending Approval */}
      {pendingUsers.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <Clock className="h-4 w-4" />
              승인 대기 ({pendingUsers.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUsers.map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-yellow-200 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email} · 가입 {new Date(user.createdAt).toLocaleDateString("ko-KR")}
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
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs px-2"
                      onClick={() => {
                        if (confirm(`${user.name} 계정을 거절하고 삭제하시겠습니까?`)) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      거절
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
            사용자 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">사용자가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {approvedUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <Badge variant={user.role === "ADMIN" ? "default" : "outline"} className="text-[10px] h-4">
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.email} · 다운로드 {user.downloadCount}개 ·{" "}
                      가입 {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-3">
                    <Dialog open={selectedUser?.id === user.id} onOpenChange={open => setSelectedUser(open ? user : null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-[#598392]">
                          <UserCog className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>사용자 설정 — {user.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">역할 변경</p>
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
                              if (confirm(`${user.name} 사용자를 삭제하시겠습니까? 모든 다운로드 기록도 삭제됩니다.`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            사용자 삭제
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
