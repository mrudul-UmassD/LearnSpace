import { redactSecrets, safeErrorMessage, truncateByBytes } from '@/lib/security/strings';
import { writeAuditEvent } from '@/lib/audit/audit-log';

const RUNNER_SERVICE_URL = process.env.RUNNER_SERVICE_URL || 'http://runner:8080';

export type RunnerTest = Record<string, unknown>;

export type RunnerClientOptions = {
  requestId: string;
  route: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  questId?: string;

  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
};

export type RunnerClientResult = {
  success: boolean;
  allPassed: boolean;
  stdout: string;
  stderr: string;
  testResults: Array<Record<string, any>>;
  executionTimeMs: number;
  error?: string;
  truncatedStdout?: boolean;
  truncatedStderr?: boolean;
  transportError?: boolean;
  runnerStatus?: number;
  errorCode?: string;
};

export async function runViaRunner(params: {
  code: string;
  tests: RunnerTest[];
  options: RunnerClientOptions;
}): Promise<RunnerClientResult> {
  const { options } = params;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const runnerResponse = await fetch(`${RUNNER_SERVICE_URL}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': options.requestId,
      },
      body: JSON.stringify({ code: params.code, tests: params.tests }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!runnerResponse.ok) {
      let errorData: any = null;
      try {
        errorData = await runnerResponse.json();
      } catch {
        errorData = null;
      }

      const message = redactSecrets(
        typeof errorData?.error === 'string'
          ? errorData.error
          : `Runner service error (HTTP ${runnerResponse.status})`
      );

      await writeAuditEvent({
        ts: new Date().toISOString(),
        level: 'error',
        event: 'runner.http_error',
        requestId: options.requestId,
        route: options.route,
        userId: options.userId,
        ip: options.ip,
        userAgent: options.userAgent,
        questId: options.questId,
        runnerStatus: runnerResponse.status,
        errorCode: 'RUNNER_HTTP_ERROR',
        message,
      });

      return {
        success: false,
        allPassed: false,
        stdout: '',
        stderr: message,
        testResults: [],
        executionTimeMs: 0,
        error: message,
        transportError: true,
        runnerStatus: runnerResponse.status,
        errorCode: 'RUNNER_HTTP_ERROR',
      };
    }

    const result: any = await runnerResponse.json();

    const rawStdout = redactSecrets(typeof result.stdout === 'string' ? result.stdout : '');
    const rawStderr = redactSecrets(typeof result.stderr === 'string' ? result.stderr : '');

    const stdoutTrunc = truncateByBytes(rawStdout, options.maxStdoutBytes);
    const stderrTrunc = truncateByBytes(rawStderr, options.maxStderrBytes);

    if (stdoutTrunc.truncated || stderrTrunc.truncated) {
      await writeAuditEvent({
        ts: new Date().toISOString(),
        level: 'warn',
        event: 'runner.output_truncated',
        requestId: options.requestId,
        route: options.route,
        userId: options.userId,
        ip: options.ip,
        userAgent: options.userAgent,
        questId: options.questId,
        errorCode: 'OUTPUT_TRUNCATED',
        meta: {
          stdoutBytes: Buffer.byteLength(rawStdout, 'utf8'),
          stderrBytes: Buffer.byteLength(rawStderr, 'utf8'),
          maxStdoutBytes: options.maxStdoutBytes,
          maxStderrBytes: options.maxStderrBytes,
        },
      });
    }

    return {
      success: !!result.success,
      allPassed: !!result.allPassed,
      stdout: stdoutTrunc.value,
      stderr: stderrTrunc.value,
      testResults: Array.isArray(result.testResults) ? result.testResults : [],
      executionTimeMs: typeof result.executionTimeMs === 'number' ? result.executionTimeMs : 0,
      error: typeof result.error === 'string' ? redactSecrets(result.error) : undefined,
      truncatedStdout: stdoutTrunc.truncated,
      truncatedStderr: stderrTrunc.truncated,
      transportError: false,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    const isAbort = err?.name === 'AbortError';
    const message = redactSecrets(isAbort ? 'Runner service timeout' : safeErrorMessage(err));

    await writeAuditEvent({
      ts: new Date().toISOString(),
      level: 'error',
      event: isAbort ? 'runner.timeout' : 'runner.network_error',
      requestId: options.requestId,
      route: options.route,
      userId: options.userId,
      ip: options.ip,
      userAgent: options.userAgent,
      questId: options.questId,
      errorCode: isAbort ? 'RUNNER_TIMEOUT' : 'RUNNER_NETWORK_ERROR',
      message,
    });

    return {
      success: false,
      allPassed: false,
      stdout: '',
      stderr: isAbort ? 'Runner service did not respond in time' : message,
      testResults: [],
      executionTimeMs: isAbort ? options.timeoutMs : 0,
      error: message,
      transportError: true,
      errorCode: isAbort ? 'RUNNER_TIMEOUT' : 'RUNNER_NETWORK_ERROR',
    };
  }
}
