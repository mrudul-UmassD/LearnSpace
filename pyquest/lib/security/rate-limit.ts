type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
};

type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

function cleanupExpired(currentTimeMs: number) {
  // Opportunistic cleanup to avoid unbounded growth.
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAtMs <= currentTimeMs) {
      buckets.delete(key);
    }
  }
}

function nowMs() {
  return Date.now();
}

export function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const currentTimeMs = nowMs();
  cleanupExpired(currentTimeMs);
  const existing = buckets.get(params.key);

  if (!existing || existing.resetAtMs <= currentTimeMs) {
    const resetAtMs = currentTimeMs + params.windowMs;
    buckets.set(params.key, { count: 1, resetAtMs });
    return {
      allowed: true,
      limit: params.limit,
      remaining: Math.max(params.limit - 1, 0),
      resetAtMs,
    };
  }

  if (existing.count >= params.limit) {
    return {
      allowed: false,
      limit: params.limit,
      remaining: 0,
      resetAtMs: existing.resetAtMs,
    };
  }

  existing.count += 1;
  buckets.set(params.key, existing);

  return {
    allowed: true,
    limit: params.limit,
    remaining: Math.max(params.limit - existing.count, 0),
    resetAtMs: existing.resetAtMs,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const resetSeconds = Math.ceil((result.resetAtMs - nowMs()) / 1000);
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.max(resetSeconds, 0)),
  };
}
