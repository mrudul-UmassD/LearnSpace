import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';
import { calculateLevel } from '@/types/gamification';

const RUNNER_SERVICE_URL = process.env.RUNNER_SERVICE_URL || 'http://runner:8080';
const REQUEST_TIMEOUT = 10000;
const SCHEMA_VERSION = '2026-02-02';

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
  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, error: 'Invalid code' }, { status: 400 });
    }

    const questLoader = getQuestLoader();
    const quest = questLoader.getQuestById(id);

    if (!quest) {
      return NextResponse.json({ schemaVersion: SCHEMA_VERSION, error: 'Quest not found' }, { status: 404 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let result: {
      success?: boolean;
      allPassed: boolean;
      stdout: string;
      stderr: string;
      testResults: Array<Record<string, any>>;
      executionTimeMs?: number;
      error?: string;
    };

    try {
      const runnerResponse = await fetch(`${RUNNER_SERVICE_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, tests: quest.tests }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!runnerResponse.ok) {
        const errorData = await runnerResponse.json().catch(() => ({ error: 'Runner error' }));
        return NextResponse.json({
          schemaVersion: SCHEMA_VERSION,
          success: false,
          error: errorData.error || 'Runner service error',
          message: errorData.error || 'Runner service error',
          runtimeMs: 0,
          stdout: '',
          stderr: errorData.error || 'Execution failed',
          testResults: [],
          allPassed: false
        }, { status: 500 });
      }

      const runnerResult = await runnerResponse.json();
      result = {
        success: runnerResult.success,
        allPassed: runnerResult.allPassed || false,
        stdout: runnerResult.stdout || '',
        stderr: runnerResult.stderr || '',
        testResults: runnerResult.testResults || [],
        executionTimeMs: runnerResult.executionTimeMs || 0,
        error: runnerResult.error
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          schemaVersion: SCHEMA_VERSION,
          success: false,
          error: 'Execution timeout',
          message: 'Runner service did not respond in time',
          runtimeMs: REQUEST_TIMEOUT,
          stdout: '',
          stderr: 'Runner service did not respond in time',
          testResults: [],
          allPassed: false
        }, { status: 504 });
      }

      return NextResponse.json({
        schemaVersion: SCHEMA_VERSION,
        success: false,
        error: 'Failed to connect to runner service',
        message: fetchError.message || 'Service unavailable',
        runtimeMs: 0,
        stdout: '',
        stderr: fetchError.message || 'Service unavailable',
        testResults: [],
        allPassed: false
      }, { status: 503 });
    }

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
    const xpAlreadyAwarded = existingAttempt?.xpAwarded ?? false;
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
      timestamp: new Date().toISOString()
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
        xpEarned: shouldAwardXP ? quest.xpReward : 0,
        xpAwarded: shouldAwardXP,
        firstCompletedAt: result.allPassed ? new Date() : null
      },
      update: {
        status: result.allPassed ? 'completed' : 'in_progress',
        lastCode: code,
        attemptsCount: nextAttemptsCount,
        hintTierUnlocked,
        lastResult,
        passed: result.allPassed,
        xpEarned: shouldAwardXP ? quest.xpReward : (existingAttempt?.xpEarned ?? 0),
        xpAwarded: shouldAwardXP ? true : (existingAttempt?.xpAwarded ?? false),
        firstCompletedAt: hasNewPass ? new Date() : existingAttempt?.firstCompletedAt,
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

    return NextResponse.json({
      schemaVersion: SCHEMA_VERSION,
      success: true,
      allPassed: result.allPassed,
      stdout: result.stdout,
      stderr: result.stderr,
      testResults: result.testResults,
      executionTime: result.executionTimeMs || 0,
      xpEarned: shouldAwardXP ? quest.xpReward : 0,
      streakBonus: shouldAwardXP ? streakBonus : 0,
      totalXPAwarded: shouldAwardXP ? totalXPAwarded : 0,
      leveledUp: shouldAwardXP ? leveledUp : false,
      newLevel: (shouldAwardXP && leveledUp) ? newLevel : undefined,
      attempt: {
        attemptsCount: attempt.attemptsCount,
        hintTierUnlocked: attempt.hintTierUnlocked,
        lastResult: attempt.lastResult
      },
      hintPolicy: {
        hintUnlockAttempts,
        nextHintUnlockAtAttempt
      }
    });
  } catch (error) {
    console.error('Error executing code:', error);
    return NextResponse.json({ 
      schemaVersion: SCHEMA_VERSION,
      success: false,
      allPassed: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
      testResults: [],
      executionTime: 0,
      error: 'Code execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
