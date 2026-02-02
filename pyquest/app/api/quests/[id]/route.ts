import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questLoader = getQuestLoader();
    const quest = questLoader.getQuestById(id);

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    // Get user's attempt for this quest
    const attempt = await prisma.questAttempt.findUnique({
      where: {
        userId_questId: {
          userId: session.user.id,
          questId: id
        }
      }
    });

    // Return quest data with user progress (but hide solution)
    const { solutionHidden, ...questData } = quest;
    
    return NextResponse.json({
      ...questData,
      userProgress: attempt ? {
        status: attempt.status,
        lastCode: attempt.lastCode,
        attemptsCount: attempt.attemptsCount,
        passed: attempt.passed,
        xpEarned: attempt.xpEarned
      } : null
    });
  } catch (error) {
    console.error('Error fetching quest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
