import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { getClientIp } from '@/lib/security/ip';
import { rateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';
import { runViaRunner } from '@/lib/runner-client';
import { writeAuditEvent } from '@/lib/audit/audit-log';
import { redactSecrets, safeErrorMessage } from '@/lib/security/strings';
import crypto from 'crypto';

/**
 * Code Execution API - Docker Runner Service
 * 
 * This endpoint proxies code execution requests to the Docker runner service.
 * The runner service provides:
 * - Isolated Docker container execution
 * - No network access for executed code
 * - Read-only filesystem except /tmp
 * - CPU/memory limits (0.5 cores, 256MB)
 * - 2-second timeout
 * - 1MB output limit
 */

const REQUEST_TIMEOUT = 10000; // 10 seconds for runner service response
const SCHEMA_VERSION = '2026-02-02';

const MAX_CODE_CHARS = Number(process.env.RUN_CODE_MAX_CHARS || 30_000);
const MAX_STDOUT_BYTES = Number(process.env.RUN_STDOUT_MAX_BYTES || 64 * 1024);
const MAX_STDERR_BYTES = Number(process.env.RUN_STDERR_MAX_BYTES || 64 * 1024);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RUN_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RUN_RATE_LIMIT_MAX || 20);

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  console.log(`[api] /api/run request received`, { requestId });

  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit({
      key: `run:${session.user.id}:${ip}`,
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rl.allowed) {
      await writeAuditEvent({
        ts: new Date().toISOString(),
        level: 'warn',
        event: 'api.rate_limited',
        requestId,
        route: '/api/run',
        userId: session.user.id,
        ip,
        userAgent,
        errorCode: 'RATE_LIMIT',
        meta: { limit: rl.limit, windowMs: RATE_LIMIT_WINDOW_MS },
      });

      return NextResponse.json(
        { schemaVersion: SCHEMA_VERSION, requestId, error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { questId, userCode } = await request.json();

    // Validate inputs
    if (!questId || typeof questId !== 'string') {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid questId' }, { status: 400 });
    }

    if (questId.length > 128 || !/^[a-z0-9-]+$/.test(questId)) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid questId format' }, { status: 400 });
    }

    if (!userCode || typeof userCode !== 'string') {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid userCode' }, { status: 400 });
    }

    if (userCode.length > MAX_CODE_CHARS) {
      return NextResponse.json(
        {
          schemaVersion: SCHEMA_VERSION,
          requestId,
          error: `Code too large (max ${MAX_CODE_CHARS} chars)`
        },
        { status: 413 }
      );
    }

    // Load quest
    const questLoader = getQuestLoader();
    const quest = questLoader.getQuestById(questId);

    if (!quest) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Quest not found' }, { status: 404 });
    }

    // Call Docker runner service (hardened)
    console.log(`Executing code for quest: ${quest.title} (User: ${session.user.email})`);

    const result = await runViaRunner({
      code: userCode,
      tests: quest.tests as any,
      options: {
        requestId,
        route: '/api/run',
        userId: session.user.id,
        ip,
        userAgent,
        questId,
        timeoutMs: REQUEST_TIMEOUT,
        maxStdoutBytes: MAX_STDOUT_BYTES,
        maxStderrBytes: MAX_STDERR_BYTES,
      },
    });

    const status = result.transportError
      ? (result.errorCode === 'RUNNER_TIMEOUT' ? 504 : 503)
      : 200;

    const response = NextResponse.json(
      {
        schemaVersion: SCHEMA_VERSION,
        requestId,
        success: result.success,
        questId,
        stdout: result.stdout,
        stderr: result.stderr,
        testResults: result.testResults,
        runtimeMs: result.executionTimeMs,
        allPassed: result.allPassed,
        error: result.error,
        truncatedStdout: result.truncatedStdout,
        truncatedStderr: result.truncatedStderr,
        transportError: result.transportError,
        runnerStatus: result.runnerStatus,
        errorCode: result.errorCode,
      },
      { status, headers: rateLimitHeaders(rl) }
    );

    console.log(`[api] /api/run response sent`, { requestId, status });
    return response;

  } catch (error) {
    const message = redactSecrets(safeErrorMessage(error));
    console.error('Error in /api/run:', message);
    await writeAuditEvent({
      ts: new Date().toISOString(),
      level: 'error',
      event: 'api.unhandled_error',
      requestId,
      route: '/api/run',
      ip,
      userAgent,
      errorCode: 'UNHANDLED',
      message,
    });
    return NextResponse.json({ 
      schemaVersion: SCHEMA_VERSION,
      requestId,
      success: false,
      error: 'Code execution failed',
      message: 'Internal error',
      runtimeMs: 0,
      stdout: '',
      stderr: 'Internal error',
      testResults: []
    }, { status: 500 });
  }
}

/**
 * GET method not supported
 */
export async function GET() {
  return NextResponse.json({ 
    schemaVersion: SCHEMA_VERSION,
    error: 'Method not allowed',
    message: 'Use POST with { questId, userCode }'
  }, { status: 405 });
}
