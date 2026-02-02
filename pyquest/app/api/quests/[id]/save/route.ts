import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

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

    // Update or create quest attempt with last code
    await prisma.questAttempt.upsert({
      where: {
        userId_questId: {
          userId: session.user.id,
          questId: id
        }
      },
      create: {
        userId: session.user.id,
        questId: id,
        status: 'in_progress',
        lastCode: code,
        attemptsCount: 0,
        passed: false,
        xpEarned: 0
      },
      update: {
        lastCode: code,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving code:', error);
    return NextResponse.json({ 
      error: 'Failed to save code',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
