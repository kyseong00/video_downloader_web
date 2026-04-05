"use client";
import { createContext, useContext } from "react";

const SiteNameContext = createContext<string>("video_downloader");

export function SiteNameProvider({ siteName, children }: { siteName: string; children: React.ReactNode }) {
  return <SiteNameContext.Provider value={siteName}>{children}</SiteNameContext.Provider>;
}

export function useSiteNameContext(): string {
  return useContext(SiteNameContext);
}
