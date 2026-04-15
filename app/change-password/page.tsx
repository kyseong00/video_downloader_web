"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { update } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError(t("settings.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("settings.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await axios.patch("/api/user/password", { currentPassword, newPassword });
      await update({}); // 세션 갱신 (mustChangePassword -> false)
      router.push("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t("common.error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#598392]/10 mb-2">
            <Lock className="h-6 w-6 text-[#598392]" />
          </div>
          <CardTitle>{t("changePassword.title")}</CardTitle>
          <CardDescription>{t("changePassword.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full h-11 bg-[#598392] hover:bg-[#4a7280] text-white"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {t("settings.changePasswordButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
