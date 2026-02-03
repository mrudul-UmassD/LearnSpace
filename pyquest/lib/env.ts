type RequiredEnvKey = 'NEXTAUTH_URL' | 'NEXTAUTH_SECRET' | 'DATABASE_URL';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateNextAuthUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'must start with http:// or https://';
    return null;
  } catch {
    return 'must be a valid URL';
  }
}

export function assertRequiredServerEnv(): void {
  const requiredKeys: RequiredEnvKey[] = ['NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'DATABASE_URL'];
  const missing = requiredKeys.filter((key) => !isNonEmptyString(process.env[key]));

  if (missing.length > 0) {
    throw new Error(
      `[startup] Missing required environment variables: ${missing.join(', ')}. ` +
        `See .env.example for local development.`
    );
  }

  const urlError = validateNextAuthUrl(process.env.NEXTAUTH_URL!);
  if (urlError) {
    throw new Error(`[startup] NEXTAUTH_URL ${urlError} (got: ${process.env.NEXTAUTH_URL})`);
  }

  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_SECRET!.length < 32) {
    throw new Error('[startup] NEXTAUTH_SECRET must be at least 32 characters in production.');
  }
}
