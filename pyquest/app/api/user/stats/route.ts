import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { calculateLevel } from '@/types/gamification';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with all game mechanics data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastLoginDate: true,
        questAttempts: {
          where: { passed: true },
          select: { questId: true }
        },
        worldProgress: {
          select: { 
            questsCompleted: true,
            totalQuests: true 
          }
        },
        userAchievements: {
          select: { id: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate statistics
    const totalQuestsCompleted = user.questAttempts.length;
    const totalWorldsCompleted = user.worldProgress.filter(
      (wp: any) => wp.questsCompleted === wp.totalQuests && wp.totalQuests > 0
    ).length;
    const achievementsUnlocked = user.userAchievements.length;

    // Calculate level from XP (in case it's out of sync)
    const calculatedLevel = calculateLevel(user.xp);

    const stats = {
      xp: user.xp,
      level: calculatedLevel,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      totalQuestsCompleted,
      totalWorldsCompleted,
      achievementsUnlocked,
      lastLoginDate: user.lastLoginDate,
    };

    return NextResponse.json({
      schemaVersion: '2026-02-02',
      stats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { 
        schemaVersion: '2026-02-02',
        error: 'Failed to fetch user stats',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
