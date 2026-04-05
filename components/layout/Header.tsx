"use client";
import { Moon, Sun, User, Check, Languages, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { signOut } from "next-auth/react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { SidebarToggle } from "./Sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/lib/i18n/config";

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  userName?: string;
}

export function Header({ onMenuClick, title, userName }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const current = i18n.language as Locale;

  const setLocale = async (locale: Locale) => {
    if (locale === current) return;
    await i18n.changeLanguage(locale);
    await axios.patch("/api/user/locale", { locale }).catch(() => {});
    startTransition(() => router.refresh());
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6">
      <SidebarToggle onClick={onMenuClick} />

      <h1 className="flex-1 text-lg font-semibold text-foreground truncate">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full"
          title={t("common.themeToggle")}
        >
          <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-muted cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[#598392]/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#598392] text-white text-sm font-semibold">
                {userName ? userName[0].toUpperCase() : <User className="h-4 w-4" />}
              </div>
              {userName && (
                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                  {userName}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {userName && (
              <>
                <DropdownMenuLabel>{userName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages className="h-4 w-4" />
                <span className="flex-1">{t("common.language")}</span>
                <span className="text-xs text-muted-foreground">{current === "ko" ? "KO" : "EN"}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setLocale("ko")}>
                  <span className="flex-1">{t("common.korean")}</span>
                  {current === "ko" && <Check className="h-4 w-4 text-[#598392]" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale("en")}>
                  <span className="flex-1">{t("common.english")}</span>
                  {current === "en" && <Check className="h-4 w-4 text-[#598392]" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30">
              <LogOut className="h-4 w-4" />
              <span>{t("common.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
