export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { assertRequiredServerEnv } = await import('./lib/env');
  assertRequiredServerEnv();

  const runnerUrl = process.env.RUNNER_URL;
  if (runnerUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${runnerUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[startup] Runner health check failed (HTTP ${response.status}) at ${runnerUrl}/health`);
      }
    } catch (error) {
      console.warn(`[startup] Runner health check failed at ${runnerUrl}/health:`, error);
    }
  }
}
