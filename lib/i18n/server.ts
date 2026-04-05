import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, parseAcceptLanguage, type Locale } from "./config";

/**
 * Determine the user's locale on the server.
 * Priority: user DB setting (if logged in) > cookie > Accept-Language header > default.
 */
export async function getServerLocale(): Promise<Locale> {
  // 1. Logged-in user's saved preference
  try {
    const session = await auth();
    const userLocale = (session?.user as { locale?: string | null } | undefined)?.locale;
    if (isLocale(userLocale)) return userLocale;
  } catch { /* ignore session errors, fall through */ }

  // 2. Cookie
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  // 3. Accept-Language header
  const acceptLang = headers().get("accept-language");
  return parseAcceptLanguage(acceptLang) ?? DEFAULT_LOCALE;
}
