import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, downloads } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const [download] = await db
    .select({ thumbnail: downloads.thumbnail })
    .from(downloads)
    .where(eq(downloads.id, params.id));

  if (!download?.thumbnail) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const res = await fetch(download.thumbnail, {
      headers: {
        "Referer": new URL(download.thumbnail).origin + "/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return new NextResponse("Fetch failed", { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Fetch error", { status: 502 });
  }
}
