// JavaScript Execution Client
// Supports both browser-mode (Web Worker) and node-mode (Docker)

import { redactSecrets, safeErrorMessage, truncateByBytes } from '@/lib/security/strings';
import { writeAuditEvent } from '@/lib/audit/audit-log';

const NODE_RUNNER_URL = process.env.NODE_RUNNER_URL || 'http://localhost:8081';

export type JsRunnerTest = Record<string, unknown>;

export type JsRunnerClientOptions = {
  requestId: string;
  route: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  questId?: string;
  mode: 'browser' | 'node'; // Execution mode

  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
};

export type JsRunnerClientResult = {
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

/**
 * Run JavaScript code via Node runner service (Docker-based for backend JS)
 */
export async function runViaNodeRunner(params: {
  code: string;
  tests: JsRunnerTest[];
  dataset?: {
    files: Array<{ name: string; content: string }>;
  };
  options: JsRunnerClientOptions;
}): Promise<JsRunnerClientResult> {
  const { options } = params;

  console.log(`[js-runner-client] Attempting to connect to Node runner service at: ${NODE_RUNNER_URL}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const runnerResponse = await fetch(`${NODE_RUNNER_URL}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': options.requestId,
      },
      body: JSON.stringify({ code: params.code, tests: params.tests, dataset: params.dataset }),
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
          : `Node runner service error (HTTP ${runnerResponse.status})`
      );

      await writeAuditEvent({
        ts: new Date().toISOString(),
        level: 'error',
        event: 'api.node_runner.http_error',
        requestId: options.requestId,
        route: options.route,
        userId: options.userId,
        ip: options.ip,
        userAgent: options.userAgent,
        questId: options.questId,
        errorCode: 'NODE_RUNNER_HTTP_ERROR',
        meta: { status: runnerResponse.status, error: message },
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
        errorCode: 'NODE_RUNNER_HTTP_ERROR',
      };
    }

    const runnerData = await runnerResponse.json();

    const stdout = truncateByBytes(runnerData.stdout || '', options.maxStdoutBytes);
    const stderr = truncateByBytes(runnerData.stderr || '', options.maxStderrBytes);

    return {
      success: runnerData.success ?? false,
      allPassed: runnerData.allPassed ?? false,
      stdout: stdout.truncated,
      stderr: stderr.truncated,
      testResults: runnerData.testResults || [],
      executionTimeMs: runnerData.executionTimeMs || 0,
      error: runnerData.error,
      truncatedStdout: stdout.wasTruncated,
      truncatedStderr: stderr.wasTruncated,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    const isAborted = error.name === 'AbortError';
    const errorCode = isAborted ? 'NODE_RUNNER_TIMEOUT' : 'NODE_RUNNER_NETWORK_ERROR';
    const message = isAborted
      ? `Execution timeout (>${options.timeoutMs}ms)`
      : '🟡 Node.js runner service not available.\n\n' +
        'The Node runner is required for backend JavaScript execution.\n\n' +
        'To start it:\n' +
        '1. Install Docker Desktop: https://www.docker.com/products/docker-desktop\n' +
        '2. Run: npm run runner:node\n' +
        '3. Wait for "Node runner started" message\n' +
        '4. Try running your code again';

    await writeAuditEvent({
      ts: new Date().toISOString(),
      level: 'error',
      event: isAborted ? 'api.node_runner.timeout' : 'api.node_runner.network_error',
      requestId: options.requestId,
      route: options.route,
      userId: options.userId,
      ip: options.ip,
      userAgent: options.userAgent,
      questId: options.questId,
      errorCode,
      meta: { message: safeErrorMessage(error) },
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
      errorCode,
    };
  }
}
