import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { PlaylistsClient } from "@/components/playlist/PlaylistsClient";

export default async function PlaylistsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <MainLayout userName={session.user?.name || ""} userRole={(session.user as { role?: string }).role}>
      <PlaylistsClient />
    </MainLayout>
  );
}
