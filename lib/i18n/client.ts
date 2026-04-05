"use client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ko from "./locales/ko.json";
import en from "./locales/en.json";
import { DEFAULT_LOCALE, type Locale } from "./config";

let initialized = false;

export function initI18n(locale: Locale = DEFAULT_LOCALE) {
  if (initialized) {
    if (i18n.language !== locale) i18n.changeLanguage(locale);
    return i18n;
  }
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        ko: { translation: ko },
        en: { translation: en },
      },
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  initialized = true;
  return i18n;
}

export default i18n;
