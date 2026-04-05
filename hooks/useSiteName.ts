"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const DEFAULT_SITE_NAME = "video_downloader";

export function useSiteName(): string {
  const { data } = useQuery<{ siteName: string }>({
    queryKey: ["app-config"],
    queryFn: () => axios.get("/api/app-config").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  return data?.siteName || DEFAULT_SITE_NAME;
}
