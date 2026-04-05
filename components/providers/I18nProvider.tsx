"use client";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { initI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // Initialize synchronously on first render
  const [instance] = useState(() => initI18n(locale));

  useEffect(() => {
    if (i18n.language !== locale) i18n.changeLanguage(locale);
  }, [locale]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
