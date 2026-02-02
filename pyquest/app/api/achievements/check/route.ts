import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { checkAndAwardAchievements } from '@/lib/achievements';
import { calculateLevel } from '@/types/gamification';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, xp: true, level: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check and award achievements
    const result = await checkAndAwardAchievements(user.id);

    // Recalculate level after XP from achievements
    if (result.totalXPFromAchievements > 0) {
      const newXP = user.xp + result.totalXPFromAchievements;
      const newLevel = calculateLevel(newXP);
      const leveledUp = newLevel > user.level;

      await prisma.user.update({
        where: { id: user.id },
        data: { level: newLevel }
      });

      return NextResponse.json({
        schemaVersion: '2026-02-02',
        newAchievements: result.newAchievements,
        totalXPAwarded: result.totalXPFromAchievements,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined
      });
    }

    return NextResponse.json({
      schemaVersion: '2026-02-02',
      newAchievements: [],
      totalXPAwarded: 0,
      leveledUp: false
    });

  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json(
      { 
        schemaVersion: '2026-02-02',
        error: 'Failed to check achievements',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
