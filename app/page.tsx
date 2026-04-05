import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { HomeClient } from "@/components/download/HomeClient";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <MainLayout
      userName={session.user?.name || ""}
      userRole={(session.user as { role?: string }).role}
    >
      <HomeClient />
    </MainLayout>
  );
}
