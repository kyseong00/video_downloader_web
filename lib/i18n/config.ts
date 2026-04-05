export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_COOKIE = "locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function parseAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  // e.g. "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
  const langs = header
    .split(",")
    .map((s) => s.trim().split(";")[0].toLowerCase().split("-")[0]);
  for (const lang of langs) {
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}
