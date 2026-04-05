"use client";
import { Moon, Sun, Bell, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { SidebarToggle } from "./Sidebar";
import { Avatar } from "./Avatar";

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  userName?: string;
}

export function Header({ onMenuClick, title, userName }: HeaderProps) {
  const { theme, setTheme } = useTheme();

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
          title="테마 전환"
        >
          <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <div className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-muted cursor-pointer transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#598392] text-white text-sm font-semibold">
            {userName ? userName[0].toUpperCase() : <User className="h-4 w-4" />}
          </div>
          {userName && (
            <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
              {userName}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
