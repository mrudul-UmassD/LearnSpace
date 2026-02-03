import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';
import { calculateLevel } from '@/types/gamification';
import { getClientIp } from '@/lib/security/ip';
import { rateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';
import { runViaRunner } from '@/lib/runner-client';
import { writeAuditEvent } from '@/lib/audit/audit-log';
import { redactSecrets, safeErrorMessage } from '@/lib/security/strings';
import crypto from 'crypto';

const REQUEST_TIMEOUT = 10000;
const SCHEMA_VERSION = '2026-02-02';

const MAX_CODE_CHARS = Number(process.env.RUN_CODE_MAX_CHARS || 30_000);
const MAX_STDOUT_BYTES = Number(process.env.RUN_STDOUT_MAX_BYTES || 64 * 1024);
const MAX_STDERR_BYTES = Number(process.env.RUN_STDERR_MAX_BYTES || 64 * 1024);
const RATE_LIMIT_WINDOW_MS = Number(process.env.EXECUTE_RATE_LIMIT_WINDOW_MS || process.env.RUN_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.EXECUTE_RATE_LIMIT_MAX || process.env.RUN_RATE_LIMIT_MAX || 20);

/**
 * Update user's daily streak
 * Returns streak bonus XP (10 XP per streak day, max 100)
 */
async function updateDailyStreak(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginDate: true, currentStreak: true, longestStreak: true }
  });

  if (!user) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let newStreak = 1;
  let streakBonus = 0;

  if (user.lastLoginDate) {
    const lastLogin = new Date(user.lastLoginDate);
    const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
    const daysDiff = Math.floor((today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no change
      return 0;
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      newStreak = user.currentStreak + 1;
      streakBonus = Math.min(newStreak * 10, 100); // 10 XP per day, max 100
    } else {
      // Streak broken, reset to 1
      newStreak = 1;
    }
  }

  const newLongestStreak = Math.max(newStreak, user.longestStreak);

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginDate: now,
      currentStreak: newStreak,
      longestStreak: newLongestStreak
    }
  });

  return streakBonus;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Unauthorized' }, { status: 401 });
    }

    if (!id || id.length > 128 || !/^[a-z0-9-]+$/.test(id)) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid quest id' }, { status: 400 });
    }

    const rl = rateLimit({
      key: `execute:${session.user.id}:${ip}`,
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rl.allowed) {
      await writeAuditEvent({
        ts: new Date().toISOString(),
        level: 'warn',
        event: 'api.rate_limited',
        requestId,
        route: '/api/quests/[id]/execute',
        userId: session.user.id,
        ip,
        userAgent,
        questId: id,
        errorCode: 'RATE_LIMIT',
        meta: { limit: rl.limit, windowMs: RATE_LIMIT_WINDOW_MS },
      });

      return NextResponse.json(
        { schemaVersion: SCHEMA_VERSION, requestId, error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Invalid code' }, { status: 400 });
    }

    if (code.length > MAX_CODE_CHARS) {
      return NextResponse.json(
        { schemaVersion: SCHEMA_VERSION, requestId, error: `Code too large (max ${MAX_CODE_CHARS} chars)` },
        { status: 413, headers: rateLimitHeaders(rl) }
      );
    }

    const questLoader = getQuestLoader();
    const quest = questLoader.getQuestById(id);

    if (!quest) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, requestId, error: 'Quest not found' }, { status: 404 });
    }

    const runnerResult = await runViaRunner({
      code,
      tests: quest.tests as any,
      options: {
        requestId,
        route: '/api/quests/[id]/execute',
        userId: session.user.id,
        ip,
        userAgent,
        questId: id,
        timeoutMs: REQUEST_TIMEOUT,
        maxStdoutBytes: MAX_STDOUT_BYTES,
        maxStderrBytes: MAX_STDERR_BYTES,
      },
    });

    if (runnerResult.transportError) {
      const status = runnerResult.errorCode === 'RUNNER_TIMEOUT'
        ? 504
        : (runnerResult.errorCode === 'RUNNER_HTTP_ERROR' ? 500 : 503);

      return NextResponse.json(
        {
          schemaVersion: SCHEMA_VERSION,
          requestId,
          success: false,
          error: runnerResult.error || 'Runner service error',
          message: runnerResult.error || 'Runner service error',
          runtimeMs: runnerResult.executionTimeMs || 0,
          stdout: '',
          stderr: runnerResult.stderr || 'Execution failed',
          testResults: [],
          allPassed: false,
          errorCode: runnerResult.errorCode,
          runnerStatus: runnerResult.runnerStatus,
        },
        { status, headers: rateLimitHeaders(rl) }
      );
    }

    const result = {
      success: runnerResult.success,
      allPassed: runnerResult.allPassed || false,
      stdout: runnerResult.stdout || '',
      stderr: runnerResult.stderr || '',
      testResults: runnerResult.testResults || [],
      executionTimeMs: runnerResult.executionTimeMs || 0,
      error: runnerResult.error,
      truncatedStdout: runnerResult.truncatedStdout,
      truncatedStderr: runnerResult.truncatedStderr,
    };

    const existingAttempt = await prisma.questAttempt.findUnique({
      where: {
        userId_questId: {
          userId: session.user.id,
          questId: id
        }
      }
    });

    const currentAttempts = existingAttempt?.attemptsCount ?? 0;
    const nextAttemptsCount = currentAttempts + 1;
    const hintUnlockAttempts = quest.hintUnlockAttempts || 2;
    const maxHintTier = quest.hints.length;
    const wasPreviouslyPassed = existingAttempt?.passed ?? false;
    const hasNewPass = result.allPassed && !wasPreviouslyPassed;
    
    // Check if XP was already awarded to prevent double-awarding
    const xpAlreadyAwarded = (existingAttempt?.xpEarned ?? 0) > 0;
    const shouldAwardXP = hasNewPass && !xpAlreadyAwarded;

    let hintTierUnlocked = existingAttempt?.hintTierUnlocked ?? 0;
    if (!result.allPassed && maxHintTier > 0 && hintUnlockAttempts > 0) {
      if (nextAttemptsCount % hintUnlockAttempts == 0) {
        hintTierUnlocked = Math.min(hintTierUnlocked + 1, maxHintTier);
      }
    }

    const nextHintUnlockAtAttempt = hintTierUnlocked < maxHintTier && hintUnlockAttempts > 0
      ? (Math.floor(nextAttemptsCount / hintUnlockAttempts) * hintUnlockAttempts) + hintUnlockAttempts
      : null;

    const lastResult = {
      schemaVersion: SCHEMA_VERSION,
      allPassed: result.allPassed,
      stdout: result.stdout,
      stderr: result.stderr,
      testResults: result.testResults,
      runtimeMs: result.executionTimeMs || 0,
      timestamp: new Date().toISOString(),
      requestId,
      truncatedStdout: result.truncatedStdout,
      truncatedStderr: result.truncatedStderr
    };

    // Award XP and update streak if this is a new completion
    let totalXPAwarded = 0;
    let streakBonus = 0;
    let leveledUp = false;
    let newLevel = 0;

    if (shouldAwardXP) {
      // Update daily streak and get bonus XP
      streakBonus = await updateDailyStreak(session.user.id);
      totalXPAwarded = quest.xpReward + streakBonus;

      // Get current user data
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { xp: true, level: true }
      });

      if (currentUser) {
        const oldLevel = currentUser.level;
        const newXP = currentUser.xp + totalXPAwarded;
        newLevel = calculateLevel(newXP);
        leveledUp = newLevel > oldLevel;

        // Update user XP and level
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            xp: newXP,
            level: newLevel
          }
        });
      }
    }

    // Update or create quest attempt
    const attempt = await prisma.questAttempt.upsert({
      where: {
        userId_questId: {
          userId: session.user.id,
          questId: id
        }
      },
      create: {
        userId: session.user.id,
        questId: id,
        status: result.allPassed ? 'completed' : 'in_progress',
        lastCode: code,
        attemptsCount: nextAttemptsCount,
        hintTierUnlocked,
        lastResult,
        passed: result.allPassed,
        xpEarned: shouldAwardXP ? quest.xpReward : 0
      },
      update: {
        status: result.allPassed ? 'completed' : 'in_progress',
        lastCode: code,
        attemptsCount: nextAttemptsCount,
        hintTierUnlocked,
        lastResult,
        passed: result.allPassed,
        xpEarned: shouldAwardXP ? quest.xpReward : (existingAttempt?.xpEarned ?? 0),
        updatedAt: new Date()
      }
    });

    // Update world progress if quest completed
    if (hasNewPass) {
      const worldQuests = questLoader.getQuestsByWorld(quest.world);
      const completedCount = await prisma.questAttempt.count({
        where: {
          userId: session.user.id,
          questId: { in: worldQuests.map(q => q.id) },
          passed: true
        }
      });

      await prisma.worldProgress.upsert({
        where: {
          userId_worldId: {
            userId: session.user.id,
            worldId: quest.world
          }
        },
        create: {
          userId: session.user.id,
          worldId: quest.world,
          questsCompleted: completedCount,
          totalQuests: worldQuests.length,
          xpEarned: quest.xpReward,
          isUnlocked: true
        },
        update: {
          questsCompleted: completedCount,
          xpEarned: shouldAwardXP ? { increment: quest.xpReward } : undefined
        }
      });
    }

    return NextResponse.json(
      {
        schemaVersion: SCHEMA_VERSION,
        requestId,
        success: true,
        allPassed: result.allPassed,
        stdout: result.stdout,
        stderr: result.stderr,
        testResults: result.testResults,
        executionTime: result.executionTimeMs || 0,
        truncatedStdout: result.truncatedStdout,
        truncatedStderr: result.truncatedStderr,
        xpEarned: shouldAwardXP ? quest.xpReward : 0,
        streakBonus: shouldAwardXP ? streakBonus : 0,
        totalXPAwarded: shouldAwardXP ? totalXPAwarded : 0,
        leveledUp: shouldAwardXP ? leveledUp : false,
        newLevel: (shouldAwardXP && leveledUp) ? newLevel : undefined,
        attempt: {
          attemptsCount: attempt.attemptsCount,
          hintTierUnlocked: attempt.hintTierUnlocked,
          lastResult: attempt.lastResult,
        },
        hintPolicy: {
          hintUnlockAttempts,
          nextHintUnlockAtAttempt,
        },
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error) {
    const message = redactSecrets(safeErrorMessage(error));
    console.error('Error executing code:', message);
    await writeAuditEvent({
      ts: new Date().toISOString(),
      level: 'error',
      event: 'api.unhandled_error',
      requestId,
      route: '/api/quests/[id]/execute',
      ip,
      userAgent,
      errorCode: 'UNHANDLED',
      message,
    });
    return NextResponse.json(
      {
        schemaVersion: SCHEMA_VERSION,
        requestId,
        success: false,
        allPassed: false,
        stdout: '',
        stderr: 'Internal error',
        testResults: [],
        executionTime: 0,
        error: 'Code execution failed',
        message: 'Internal error',
      },
      { status: 500 }
    );
  }
}
