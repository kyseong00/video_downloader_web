"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useSiteName } from "@/hooks/useSiteName";

interface MainLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
}

export function MainLayout({ children, userName, userRole }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const siteName = useSiteName();
  const { t } = useTranslation();

  const pageTitles: Record<string, string> = {
    "/": t("nav.home"),
    "/downloads": t("nav.downloads"),
    "/subscriptions": t("nav.subscriptions"),
    "/playlists": t("nav.playlists"),
    "/files": t("nav.files"),
    "/settings": t("nav.settings"),
    "/admin": t("nav.admin"),
  };

  const title = Object.entries(pageTitles).find(([key]) =>
    key === pathname || (key !== "/" && pathname.startsWith(key))
  )?.[1] || siteName;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          userName={userName}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
