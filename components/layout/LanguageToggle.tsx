"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";

interface LanguageToggleProps {
  variant?: "pill" | "button";
  className?: string;
}

export function LanguageToggle({ variant = "pill", className = "" }: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current = i18n.language as Locale;
  const next: Locale = current === "ko" ? "en" : "ko";

  const handleToggle = async () => {
    // Update client language immediately
    await i18n.changeLanguage(next);
    // Persist to cookie (and DB if logged in)
    await axios.patch("/api/user/locale", { locale: next }).catch(() => {});
    // Refresh SSR-rendered content so server-rendered text updates
    startTransition(() => router.refresh());
  };

  if (variant === "pill") {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#598392]/30 px-3 py-1.5 text-xs font-medium text-[#598392] hover:bg-[#598392] hover:text-white transition-colors disabled:opacity-50 ${className}`}
        aria-label="Toggle language"
      >
        <Languages className="h-3.5 w-3.5" />
        <span>{current === "ko" ? "KO" : "EN"}</span>
        <span className="text-[#598392]/40">/</span>
        <span className="opacity-50">{next === "ko" ? "KO" : "EN"}</span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={className}
    >
      <Languages className="h-4 w-4 mr-2" />
      {current === "ko" ? "한국어" : "English"}
    </Button>
  );
}
