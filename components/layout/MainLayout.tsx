"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { usePathname } from "next/navigation";
import { useSiteName } from "@/hooks/useSiteName";

const PAGE_TITLES: Record<string, string> = {
  "/": "홈",
  "/downloads": "다운로드",
  "/subscriptions": "구독",
  "/playlists": "플레이리스트",
  "/files": "파일",
  "/settings": "설정",
  "/admin": "관리자",
};

interface MainLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
}

export function MainLayout({ children, userName, userRole }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const siteName = useSiteName();

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
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
