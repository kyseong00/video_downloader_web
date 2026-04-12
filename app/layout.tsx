import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { SiteNameProvider } from "@/components/providers/SiteNameProvider";
import { PasswordGuard } from "@/components/providers/PasswordGuard";
import { getSiteName } from "@/lib/app-config";
import { getServerLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();
  return {
    title: siteName,
    description: "Self-hosted YouTube Downloader",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteName = await getSiteName();
  const locale = await getServerLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SessionProvider>
            <QueryProvider>
              <I18nProvider locale={locale}>
                <SiteNameProvider siteName={siteName}>
                  <PasswordGuard>
                    {children}
                  </PasswordGuard>
                </SiteNameProvider>
              </I18nProvider>
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
