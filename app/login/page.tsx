"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Video, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSiteName } from "@/hooks/useSiteName";

export default function LoginPage() {
  const router = useRouter();
  const siteName = useSiteName();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        let data: { error?: string } = {};
        try {
          data = await res.json();
        } catch {
          setError("서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError(data.error || "회원가입에 실패했습니다.");
          setLoading(false);
          return;
        }

        // 회원가입 성공 — 관리자 승인 대기 안내
        setPendingApproval(true);
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        // 로그인 실패 시 PENDING 상태인지 확인
        try {
          const statusRes = await fetch("/api/auth/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.email }),
          });
          const statusData = await statusRes.json();
          if (statusData.status === "PENDING") {
            setError("관리자 승인 전입니다. 승인 후 로그인이 가능합니다.");
          } else {
            setError("이메일 또는 비밀번호가 올바르지 않습니다.");
          }
        } catch {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("네트워크 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EFF6E0] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#598392] shadow-lg mb-4">
            <Video className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#598392]">{siteName}</h1>
          <p className="text-sm text-muted-foreground mt-1">셀프 호스팅 유튜브 다운로더</p>
        </div>

        {pendingApproval ? (
          <Card className="shadow-lg border-[#AEC3B0]/50">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="font-semibold text-lg">회원가입 완료</p>
                <p className="text-sm text-muted-foreground mt-1">
                  관리자가 승인 시 사용이 가능합니다.
                </p>
              </div>
              <button
                onClick={() => { setPendingApproval(false); setMode("login"); }}
                className="text-sm text-[#598392] font-medium hover:underline"
              >
                로그인 화면으로
              </button>
            </CardContent>
          </Card>
        ) : (
        <Card className="shadow-lg border-[#AEC3B0]/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {mode === "login" ? "로그인" : "회원가입"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "계정에 로그인하세요."
                : "새 계정을 만들어 시작하세요."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    placeholder="홍길동"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#598392] hover:bg-[#4a7280] text-white h-11"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? "로그인" : "회원가입"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {mode === "login" ? (
                <span>
                  계정이 없으신가요?{" "}
                  <button
                    onClick={() => { setMode("register"); setError(""); }}
                    className="text-[#598392] font-medium hover:underline"
                  >
                    회원가입
                  </button>
                </span>
              ) : (
                <span>
                  이미 계정이 있으신가요?{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className="text-[#598392] font-medium hover:underline"
                  >
                    로그인
                  </button>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
