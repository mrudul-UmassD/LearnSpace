import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';
import { evaluateComponent } from '@/lib/component-sandbox';

interface ExecuteComponentRequest {
  questId: string;
  componentCode: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: questId } = await params;
    const body: ExecuteComponentRequest = await request.json();
    const { componentCode } = body;

    // Validate quest
    const questLoader = getQuestLoader();
    const quest = questLoader.getQuestById(questId);

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    if (quest.type !== 'component') {
      return NextResponse.json(
        { error: 'Quest is not a component quest' },
        { status: 400 }
      );
    }

    if (!quest.componentTests || quest.componentTests.length === 0) {
      return NextResponse.json(
        { error: 'Quest has no component tests' },
        { status: 400 }
      );
    }

    // Execute component tests (client-side evaluation will be done in browser)
    // This endpoint primarily saves the attempt and returns quest data
    
    // Save attempt
    const attempt = await prisma.questAttempt.upsert({
      where: {
        userId_questId: {
          userId: session.user.id,
          questId,
        },
      },
      update: {
        lastCode: componentCode,
        attemptsCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
      create: {
        userId: session.user.id,
        questId,
        lastCode: componentCode,
        attemptsCount: 1,
        completed: false,
        hintTierUnlocked: 0,
        lastAttemptAt: new Date(),
      },
    });

    // Return quest data for client-side evaluation
    return NextResponse.json({
      success: true,
      quest: {
        id: quest.id,
        componentTests: quest.componentTests,
      },
      attempt: {
        attemptsCount: attempt.attemptsCount,
        hintTierUnlocked: attempt.hintTierUnlocked,
      },
      executionTimeMs: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Component execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
