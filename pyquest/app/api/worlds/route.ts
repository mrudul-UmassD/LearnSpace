import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';
import { WorldWithProgress } from '@/types/quest';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questLoader = getQuestLoader();
    const worlds = questLoader.getAllWorlds();

    // Get user's progress for each world
    const worldProgress = await prisma.worldProgress.findMany({
      where: { userId: session.user.id }
    });

    // Calculate total user XP
    const userXP = worldProgress.reduce((sum, wp) => sum + wp.xpEarned, 0);

    // Map worlds with progress
    const worldsWithProgress: WorldWithProgress[] = worlds.map(world => {
      const progress = worldProgress.find(wp => wp.worldId === world.id);
      
      return {
        ...world,
        completedQuests: progress?.questsCompleted || 0,
        earnedXP: progress?.xpEarned || 0,
        isUnlocked: progress?.isUnlocked || world.id === 'python-basics' || userXP >= (world.requiredXP || 0)
      };
    });

    return NextResponse.json(worldsWithProgress);
  } catch (error) {
    console.error('Error fetching worlds:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
