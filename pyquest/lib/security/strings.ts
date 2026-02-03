export function truncateByBytes(input: string, maxBytes: number): { value: string; truncated: boolean } {
  const byteLen = Buffer.byteLength(input, 'utf8');
  if (byteLen <= maxBytes) return { value: input, truncated: false };

  // Slice conservatively to avoid cutting multi-byte chars.
  const buffer = Buffer.from(input, 'utf8');
  const sliced = buffer.subarray(0, maxBytes);
  let value = sliced.toString('utf8');

  // If we cut in the middle of a multi-byte sequence, Node may insert replacement chars.
  // This is acceptable for sandbox output; we just want bounded size.
  value += `\n... [truncated to ${maxBytes} bytes]`;
  return { value, truncated: true };
}

export function redactSecrets(input: string): string {
  const secretEnvKeys = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXTAUTH_SECRET',
    'AUTH_SECRET',
    'RUNNER_SERVICE_URL',
    'OPENAI_API_KEY',
    'SENTRY_AUTH_TOKEN',
  ];

  let output = input;
  for (const key of secretEnvKeys) {
    const value = process.env[key];
    if (!value) continue;

    // Only redact non-trivial values.
    if (value.length < 8) continue;

    // Replace all occurrences of the literal secret value.
    output = output.split(value).join('[REDACTED]');
  }

  return output;
}

export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}
