export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startSubscriptionCron } = await import('./lib/subscription-cron');
    startSubscriptionCron();
  }
}
