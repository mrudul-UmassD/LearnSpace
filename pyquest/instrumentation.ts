export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { assertRequiredServerEnv } = await import('./lib/env');
  assertRequiredServerEnv();
}
