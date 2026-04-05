import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { FilesClient } from "@/components/download/FilesClient";

export default async function FilesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <MainLayout userName={session.user?.name || ""} userRole={(session.user as { role?: string }).role}>
      <FilesClient />
    </MainLayout>
  );
}
