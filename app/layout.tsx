import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { getSiteName } from "@/lib/app-config";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();
  return {
    title: siteName,
    description: "Self-hosted YouTube Downloader",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SessionProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
