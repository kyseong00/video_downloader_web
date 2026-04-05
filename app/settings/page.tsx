import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { SettingsClient } from "@/components/admin/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <MainLayout userName={session.user?.name || ""} userRole={(session.user as { role?: string }).role}>
      <SettingsClient userRole={(session.user as { role?: string }).role || "USER"} />
    </MainLayout>
  );
}
