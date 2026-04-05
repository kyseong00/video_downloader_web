import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db, downloads } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const safeClose = () => {
        if (closed) return;
        closed = true;
        if (timer) { clearTimeout(timer); timer = null; }
        try { controller.close(); } catch { /* already closed */ }
      };

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          safeClose();
        }
      };

      const poll = async () => {
        if (closed) return;
        try {
          const [download] = await db.select().from(downloads)
            .where(and(eq(downloads.id, params.id), eq(downloads.userId, session.user!.id!)));

          if (!download) {
            send({ error: "Not found" });
            safeClose();
            return;
          }

          send({
            id: download.id,
            status: download.status,
            progress: download.progress,
            title: download.title,
            thumbnail: download.thumbnail,
            duration: download.duration,
            width: download.width,
            height: download.height,
            fileSize: download.fileSize,
            filePath: download.filePath,
            speed: download.speed,
            eta: download.eta,
            error: download.error,
          });

          if (download.status === "DONE" || download.status === "ERROR") {
            safeClose();
            return;
          }

          timer = setTimeout(poll, 2000);
        } catch {
          safeClose();
        }
      };

      req.signal.addEventListener("abort", () => safeClose());

      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
