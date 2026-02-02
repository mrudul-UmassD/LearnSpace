import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { AchievementProgress } from '@/types/gamification';

export async function GET(request: NextRequest) {
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
      include: {
        questAttempts: {
          where: { passed: true },
          select: { questId: true }
        },
        worldProgress: {
          select: {
            worldId: true,
            questsCompleted: true,
            totalQuests: true
          }
        },
        userAchievements: {
          include: {
            achievement: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all achievement definitions
    const allAchievements = await prisma.achievementDefinition.findMany({
      orderBy: [
        { category: 'asc' },
        { requirement: 'asc' }
      ]
    });

    // Calculate progress metrics
    const totalQuestsCompleted = user.questAttempts.length;
    const currentStreak = user.currentStreak;
    const currentLevel = user.level;
    const completedWorlds = user.worldProgress.filter(
      (wp: any) => wp.questsCompleted === wp.totalQuests && wp.totalQuests > 0
    );

    // Get unlocked achievement IDs
    const unlockedMap = new Map(
      user.userAchievements.map((ua: any) => [ua.achievementId, ua.unlockedAt])
    );

    // Build progress data for each achievement
    const achievements: AchievementProgress[] = allAchievements.map((achievement: any) => {
      const unlocked = unlockedMap.has(achievement.id);
      const unlockedAt = unlockedMap.get(achievement.id) || null;

      let progress = 0;
      let requirement = achievement.requirement;

      // Calculate current progress based on category
      switch (achievement.category) {
        case 'quest':
          progress = totalQuestsCompleted;
          break;
        
        case 'streak':
          progress = currentStreak;
          break;
        
        case 'world':
          if (achievement.code.startsWith('world_')) {
            const worldId = achievement.code.replace('world_', '').replace(/_/g, '-');
            const worldProgress = user.worldProgress.find((wp: any) => wp.worldId === worldId);
            if (worldProgress && worldProgress.totalQuests > 0) {
              progress = worldProgress.questsCompleted;
              requirement = worldProgress.totalQuests;
            }
          } else if (achievement.code === 'first_world') {
            progress = completedWorlds.length;
          }
          break;
        
        case 'milestone':
          if (achievement.code.startsWith('level_')) {
            progress = currentLevel;
          }
          break;
      }

      return {
        achievement: {
          id: achievement.id,
          code: achievement.code,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xpReward,
          category: achievement.category as 'quest' | 'streak' | 'world' | 'milestone',
          requirement: achievement.requirement,
          secret: achievement.secret
        },
        unlocked,
        unlockedAt,
        progress: Math.min(progress, requirement),
        requirement
      };
    });

    // Filter secret achievements if not unlocked
    const visibleAchievements = achievements.filter(
      a => !a.achievement.secret || a.unlocked
    );

    return NextResponse.json({
      schemaVersion: '2026-02-02',
      achievements: visibleAchievements
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { 
        schemaVersion: '2026-02-02',
        error: 'Failed to fetch achievements',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
