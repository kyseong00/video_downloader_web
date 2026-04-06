import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { AdminFilesClient } from "@/components/admin/AdminFilesClient";

export default async function AdminFilesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/");

  return (
    <MainLayout userName={session.user?.name || ""} userRole={role}>
      <AdminFilesClient />
    </MainLayout>
  );
}
