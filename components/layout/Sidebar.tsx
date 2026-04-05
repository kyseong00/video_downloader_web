"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home, Download, Rss, ListMusic, FolderOpen,
  Settings, Shield, LogOut, Video, X, Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSiteName } from "@/hooks/useSiteName";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/downloads", label: "다운로드", icon: Download },
  { href: "/subscriptions", label: "구독", icon: Rss },
  { href: "/playlists", label: "플레이리스트", icon: ListMusic },
  { href: "/files", label: "파일", icon: FolderOpen },
];

const bottomItems = [
  { href: "/settings", label: "설정", icon: Settings },
  { href: "/admin", label: "관리자", icon: Shield, adminOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export function Sidebar({ isOpen, onClose, userRole }: SidebarProps) {
  const pathname = usePathname();
  const siteName = useSiteName();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 flex-col bg-card border-r border-border shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none overscroll-contain",
          isOpen ? "translate-x-0 flex" : "-translate-x-full flex lg:flex"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#598392]">
              <Video className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-base text-[#598392]">{siteName}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#598392] text-white shadow-sm"
                    : "text-foreground hover:bg-muted hover:text-[#598392]"
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Bottom items */}
        <div className="py-3 px-3 space-y-1">
          {bottomItems.map((item) => {
            if (item.adminOnly && userRole !== "ADMIN") return null;
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#598392] text-white"
                    : "text-foreground hover:bg-muted hover:text-[#598392]"
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} className="lg:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  );
}
