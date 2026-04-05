import { db, userSettings } from "./db";
import { eq } from "drizzle-orm";
import { checkUserSubscriptions } from "./subscription-worker";

let started = false;

export function startSubscriptionCron() {
  if (started) return;
  started = true;

  const runCheck = async () => {
    try {
      const allSettings = await db.select().from(userSettings);
      const now = Date.now();

      for (const settings of allSettings) {
        const lastCheck = settings.lastAutoChecked
          ? new Date(settings.lastAutoChecked).getTime()
          : 0;
        const intervalMs = (settings.pollInterval || 3600) * 1000;

        if (now - lastCheck < intervalMs) continue;

        await checkUserSubscriptions(settings.userId, {
          userId: settings.userId,
          cookieContent: settings.cookieContent || "",
          ytdlpArgs: settings.ytdlpArgs || "",
          rateLimit: settings.rateLimit || "",
          maxGlobalConcurrent: (settings as Record<string, unknown>).maxGlobalConcurrent as number ?? 3,
          globalRateLimit: (settings as Record<string, unknown>).globalRateLimit as string ?? "",
        });

        await db.update(userSettings)
          .set({ lastAutoChecked: new Date().toISOString() })
          .where(eq(userSettings.userId, settings.userId));
      }
    } catch (err) {
      console.error("[subscription-cron] error:", err);
    }
  };

  // First run after 10 seconds, then every 60 seconds
  setTimeout(runCheck, 10_000);
  setInterval(runCheck, 60_000);
}
