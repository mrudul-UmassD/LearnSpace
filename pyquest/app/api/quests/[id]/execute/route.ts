import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';
import { executeUserCode } from '@/lib/code-executor';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const questLoader = getQuestLoader();
    const quest = questLoader.getQuestById(id);

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    // Execute code and run tests
    // Note: This uses local Python execution (DEV ONLY)
    // See /api/run for the actual execution logic
    const result = await executeUserCode(code, quest.tests);

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
        attemptsCount: 1,
        passed: result.allPassed,
        xpEarned: result.allPassed ? quest.xpReward : 0
      },
      update: {
        status: result.allPassed ? 'completed' : 'in_progress',
        lastCode: code,
        attemptsCount: { increment: 1 },
        passed: result.allPassed,
        xpEarned: result.allPassed ? quest.xpReward : 0,
        updatedAt: new Date()
      }
    });

    // Update world progress if quest completed
    if (result.allPassed && !attempt.passed) {
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
          xpEarned: result.allPassed && !attempt.passed ? { increment: quest.xpReward } : undefined
        }
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      xpEarned: result.allPassed ? quest.xpReward : 0
    });
  } catch (error) {
    console.error('Error executing code:', error);
    return NextResponse.json({ 
      error: 'Code execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
