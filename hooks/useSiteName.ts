"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useSiteNameContext } from "@/components/providers/SiteNameProvider";

const DEFAULT_SITE_NAME = "video_downloader";

export function useSiteName(): string {
  // Initial value from SSR context (no flicker on first paint)
  const ssrValue = useSiteNameContext();

  const { data } = useQuery<{ siteName: string }>({
    queryKey: ["app-config"],
    queryFn: () => axios.get("/api/app-config").then(r => r.data),
    staleTime: 5 * 60 * 1000,
    initialData: { siteName: ssrValue },
  });
  return data?.siteName || ssrValue || DEFAULT_SITE_NAME;
}
