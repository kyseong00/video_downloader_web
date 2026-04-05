import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { SubscriptionsClient } from "@/components/subscription/SubscriptionsClient";

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <MainLayout userName={session.user?.name || ""} userRole={(session.user as { role?: string }).role}>
      <SubscriptionsClient />
    </MainLayout>
  );
}
