import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { getClientIp } from '@/lib/security/ip';
import { rateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';
import { runViaRunner } from '@/lib/runner-client';
import { writeAuditEvent } from '@/lib/audit/audit-log';
import { redactSecrets, safeErrorMessage } from '@/lib/security/strings';
import { prisma } from '@/lib/db/prisma';
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
const SCHEMA_VERSION = '2026-02-07';

const MAX_CODE_CHARS = Number(process.env.RUN_CODE_MAX_CHARS || 30_000);
const MAX_STDOUT_BYTES = Number(process.env.RUN_STDOUT_MAX_BYTES || 64 * 1024);
const MAX_STDERR_BYTES = Number(process.env.RUN_STDERR_MAX_BYTES || 64 * 1024);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RUN_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RUN_RATE_LIMIT_MAX || 20);

type QuestRunPayload =
  | { questId: string; userCode: string; predictedStdout?: never; explanationText?: never; traceReadingAnswers?: never }
  | { questId: string; predictedStdout: string; userCode?: never; explanationText?: never; traceReadingAnswers?: never }
  | { questId: string; explanationText: string; userCode?: never; predictedStdout?: never; traceReadingAnswers?: never }
  | { questId: string; traceReadingAnswers: Record<string, string>; userCode?: never; predictedStdout?: never; explanationText?: never };

function normalizeOutput(out: string) {
  return out.replace(/\r\n/g, '\n').trim();
}

function hashStarterCode(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function countChangedLines(a: string, b: string) {
  const aLines = a.replace(/\r\n/g, '\n').split('\n');
  const bLines = b.replace(/\r\n/g, '\n').split('\n');
  const n = aLines.length;
  const m = bLines.length;
  const dp = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i += 1) {
    let prev = 0;
    for (let j = 1; j <= m; j += 1) {
      const temp = dp[j];
      if (aLines[i - 1] === bLines[j - 1]) {
        dp[j] = prev + 1;
      } else {
        dp[j] = Math.max(dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  const lcs = dp[m];
  return n + m - 2 * lcs;
}

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

    const payload = (await request.json()) as QuestRunPayload;
    const { questId } = payload;

    // Validate inputs
    if (!questId || typeof questId !== 'string') {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid questId' }, { status: 400 });
    }

    if (questId.length > 128 || !/^[a-z0-9-]+$/.test(questId)) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid questId format' }, { status: 400 });
    }

    // Load quest
    const questLoader = getQuestLoader();
    const quest = questLoader.getQuestById(questId);

    if (!quest) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Quest not found' }, { status: 404 });
    }

    let status = 200;
    let score = 0;
    let feedback = '';
    let unlockedHintTier: number | null = null;
    let transportError = false;
    let runnerStatus: string | undefined;
    let errorCode: string | undefined;
    let stdout = '';
    let stderr = '';
    let testResults: any[] = [];
    let allPassed = false;
    let runtimeMs: number | undefined;
    let changedLines: number | null = null;
    let maxChangedLines: number | null = null;

    if (quest.type === 'code' || quest.type === 'debug_fix') {
      const userCode = (payload as any).userCode;
      if (!userCode || typeof userCode !== 'string') {
        return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid userCode' }, { status: 400 });
      }
      if (userCode.length > MAX_CODE_CHARS) {
        return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: `Code too large (max ${MAX_CODE_CHARS} chars)` }, { status: 413 });
      }

      console.log(`Executing code for quest: ${quest.title} (User: ${session.user.email})`);
      const result = await runViaRunner({
        code: userCode,
        tests: quest.tests as any,
        dataset: quest.dataset,
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

      status = result.transportError ? (result.errorCode === 'RUNNER_TIMEOUT' ? 504 : 503) : 200;
      stdout = result.stdout;
      stderr = result.stderr;
      testResults = result.testResults;
      allPassed = result.allPassed;
      transportError = !!result.transportError;
      runnerStatus = result.runnerStatus !== undefined ? String(result.runnerStatus) : undefined;
      errorCode = result.errorCode;
      const passedCount = (result.testResults || []).filter((t: any) => t.passed).length;
      const total = (result.testResults || []).length || 1;
      score = Math.round((passedCount / total) * 100);
      feedback = allPassed ? 'All tests passed.' : 'Some tests failed. Check stderr/output.';
      runtimeMs = result.executionTimeMs;

      if (quest.type === 'debug_fix') {
        maxChangedLines = quest.debugFix?.maxChangedLines ?? 6;
        changedLines = countChangedLines(quest.starterCode, userCode);
        if (allPassed) {
          score = changedLines <= maxChangedLines
            ? 100
            : Math.max(0, Math.round((maxChangedLines / Math.max(changedLines, 1)) * 100));
          feedback = changedLines <= maxChangedLines
            ? 'All tests passed with minimal edits.'
            : 'All tests passed, but you changed more lines than recommended.';
        }

        const existingAttempt = (await prisma.questAttempt.findUnique({
          where: { userId_questId: { userId: session.user.id, questId } },
        })) as any;

        const nextAttemptsCount = (existingAttempt?.attemptsCount ?? 0) + 1;
        const lastResult = {
          schemaVersion: SCHEMA_VERSION,
          allPassed,
          stdout,
          stderr,
          testResults,
          runtimeMs: runtimeMs || 0,
          requestId,
          changedLines,
          maxChangedLines,
        };

        const createData: any = {
          userId: session.user.id,
          questId,
          status: allPassed ? 'completed' : 'in_progress',
          lastCode: userCode,
          attemptsCount: nextAttemptsCount,
          hintTierUnlocked: existingAttempt?.hintTierUnlocked ?? 0,
          lastResult,
          passed: allPassed,
          xpEarned: existingAttempt?.xpEarned ?? 0,
          starterCodeHash: hashStarterCode(quest.starterCode),
          changedLines,
        };

        const updateData: any = {
          status: allPassed ? 'completed' : 'in_progress',
          lastCode: userCode,
          attemptsCount: nextAttemptsCount,
          lastResult,
          passed: allPassed,
          starterCodeHash: existingAttempt?.starterCodeHash ?? hashStarterCode(quest.starterCode),
          changedLines,
          updatedAt: new Date(),
        };

        await prisma.questAttempt.upsert({
          where: { userId_questId: { userId: session.user.id, questId } },
          create: createData,
          update: updateData,
        });
      }
    } else if (quest.type === 'predict_output') {
      const predictedStdout = (payload as any).predictedStdout;
      if (!predictedStdout || typeof predictedStdout !== 'string') {
        return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid predictedStdout' }, { status: 400 });
      }

      const refResult = await runViaRunner({
        code: quest.solutionHidden,
        tests: [],
        dataset: quest.dataset,
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

      transportError = !!refResult.transportError;
      runnerStatus = refResult.runnerStatus !== undefined ? String(refResult.runnerStatus) : undefined;
      errorCode = refResult.errorCode;
      status = refResult.transportError ? (refResult.errorCode === 'RUNNER_TIMEOUT' ? 504 : 503) : 200;

      if (refResult.transportError || !refResult.success) {
        stdout = '';
        stderr = refResult.error || 'Runner unavailable';
        feedback = 'Runner unavailable';
      } else {
        const expected = normalizeOutput(refResult.stdout || '');
        const predicted = normalizeOutput(predictedStdout);
        const matches = expected === predicted;
        score = matches ? 100 : 0;
        stdout = '';
        stderr = '';
        feedback = matches ? 'Great job! Output matches expected.' : `Expected output does not match. Expected:\n${expected || '(empty)'}\nReceived:\n${predicted || '(empty)'}`;
        allPassed = matches;
        runtimeMs = refResult.executionTimeMs;
      }
    } else if (quest.type === 'explain') {
      const explanationText = (payload as any).explanationText;
      if (!explanationText || typeof explanationText !== 'string') {
        return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid explanationText' }, { status: 400 });
      }

      const rubric = quest.explainRubric || [];
      const totalWeight = rubric.reduce((sum, r) => sum + (r.weight || 1), 0) || 1;
      const normalized = explanationText.toLowerCase();
      let earned = 0;
      const missing: string[] = [];

      rubric.forEach(r => {
        const allMatch = r.keywords.every(k => normalized.includes(k.toLowerCase()));
        if (allMatch) {
          earned += r.weight || 1;
        } else {
          missing.push(r.description || `Missing: ${r.keywords.join(', ')}`);
        }
      });

      score = Math.round((earned / totalWeight) * 100);
      allPassed = score >= 80;
      feedback = allPassed ? 'Explanation meets rubric.' : `Needs more detail: ${missing.join('; ')}`;
      stdout = '';
      stderr = '';
    } else if (quest.type === 'trace_reading') {
      const traceReadingAnswers = (payload as any).traceReadingAnswers as Record<string, string>;
      if (!traceReadingAnswers || typeof traceReadingAnswers !== 'object') {
        return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid traceReadingAnswers' }, { status: 400 });
      }

      const questions = quest.traceReading?.questions || [];
      if (questions.length === 0) {
        return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'No questions defined for trace_reading quest' }, { status: 500 });
      }

      let totalPoints = 0;
      let earnedPoints = 0;
      const questionFeedback: string[] = [];

      questions.forEach((q, idx) => {
        const points = q.points || 1;
        totalPoints += points;
        const userAnswer = (traceReadingAnswers[q.id] || '').trim();
        const correctAnswer = q.correctAnswer.trim();

        let correct = false;
        if (q.type === 'multiple_choice') {
          // Exact match for multiple choice
          correct = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        } else {
          // Short text: keyword matching (case-insensitive)
          const keywords = q.keywords || [correctAnswer];
          const normalizedAnswer = userAnswer.toLowerCase();
          const matchedKeywords = keywords.filter(k => normalizedAnswer.includes(k.toLowerCase()));
          correct = matchedKeywords.length > 0;
        }

        if (correct) {
          earnedPoints += points;
          questionFeedback.push(`Q${idx + 1}: ✓ Correct`);
        } else {
          questionFeedback.push(`Q${idx + 1}: ✗ Incorrect (Expected: ${correctAnswer})`);
        }
      });

      score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      allPassed = score >= 80;
      feedback = `Earned ${earnedPoints}/${totalPoints} points.\n${questionFeedback.join('\n')}`;
      stdout = '';
      stderr = '';
    }

    const response = NextResponse.json(
      {
        schemaVersion: SCHEMA_VERSION,
        requestId,
        questId,
        status: allPassed ? 'passed' : 'failed',
        success: allPassed,
        score,
        feedback,
        unlockedHintTier,
        stdout,
        stderr,
        testResults,
        runtimeMs,
        changedLines,
        maxChangedLines,
        allPassed,
        transportError,
        runnerStatus,
        errorCode,
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
