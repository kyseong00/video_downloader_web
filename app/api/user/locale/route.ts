import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const locale = body.locale;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  // Set cookie (works for both logged-in and anonymous users)
  const res = NextResponse.json({ locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "lax",
  });

  // If logged in, persist to DB
  const session = await auth();
  if (session?.user?.id) {
    await db.update(users).set({ locale }).where(eq(users.id, session.user.id));
  }

  return res;
}
