// Achievement checking and awarding service
import { prisma } from '@/lib/db/prisma';
import { AchievementDefinition } from '@/types/gamification';

export interface AchievementCheckResult {
  newAchievements: Array<{
    achievement: AchievementDefinition;
    xpAwarded: number;
  }>;
  totalXPFromAchievements: number;
}

// Define all system achievements
export const ACHIEVEMENT_DEFINITIONS = [
  // Quest milestones
  {
    code: 'first_quest',
    title: 'First Steps',
    description: 'Complete your first quest',
    icon: '🎯',
    xpReward: 50,
    category: 'quest' as const,
    requirement: 1,
    secret: false,
  },
  {
    code: 'quest_5',
    title: 'Getting Started',
    description: 'Complete 5 quests',
    icon: '🌟',
    xpReward: 100,
    category: 'quest' as const,
    requirement: 5,
    secret: false,
  },
  {
    code: 'quest_10',
    title: 'Dedicated Learner',
    description: 'Complete 10 quests',
    icon: '💪',
    xpReward: 150,
    category: 'quest' as const,
    requirement: 10,
    secret: false,
  },
  {
    code: 'quest_25',
    title: 'Quest Master',
    description: 'Complete 25 quests',
    icon: '🏆',
    xpReward: 250,
    category: 'quest' as const,
    requirement: 25,
    secret: false,
  },
  {
    code: 'quest_50',
    title: 'Legendary',
    description: 'Complete 50 quests',
    icon: '👑',
    xpReward: 500,
    category: 'quest' as const,
    requirement: 50,
    secret: true,
  },
  
  // Streak achievements
  {
    code: 'streak_3',
    title: 'On a Roll',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    xpReward: 75,
    category: 'streak' as const,
    requirement: 3,
    secret: false,
  },
  {
    code: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    xpReward: 150,
    category: 'streak' as const,
    requirement: 7,
    secret: false,
  },
  {
    code: 'streak_14',
    title: 'Fortnight Champion',
    description: 'Maintain a 14-day streak',
    icon: '🌟',
    xpReward: 300,
    category: 'streak' as const,
    requirement: 14,
    secret: false,
  },
  {
    code: 'streak_30',
    title: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '💎',
    xpReward: 500,
    category: 'streak' as const,
    requirement: 30,
    secret: true,
  },
  
  // World completion
  {
    code: 'world_python_basics',
    title: 'Python Basics Master',
    description: 'Complete all Python Basics quests',
    icon: '🐍',
    xpReward: 200,
    category: 'world' as const,
    requirement: 1,
    secret: false,
  },
  {
    code: 'world_data_structures',
    title: 'Data Structures Expert',
    description: 'Complete all Data Structures quests',
    icon: '📊',
    xpReward: 300,
    category: 'world' as const,
    requirement: 1,
    secret: false,
  },
  {
    code: 'first_world',
    title: 'World Conqueror',
    description: 'Complete your first world',
    icon: '🌍',
    xpReward: 150,
    category: 'world' as const,
    requirement: 1,
    secret: false,
  },
  
  // Level milestones
  {
    code: 'level_5',
    title: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    xpReward: 100,
    category: 'milestone' as const,
    requirement: 5,
    secret: false,
  },
  {
    code: 'level_10',
    title: 'Expert Coder',
    description: 'Reach level 10',
    icon: '🎓',
    xpReward: 250,
    category: 'milestone' as const,
    requirement: 10,
    secret: false,
  },
  {
    code: 'level_20',
    title: 'Python Guru',
    description: 'Reach level 20',
    icon: '🧙‍♂️',
    xpReward: 500,
    category: 'milestone' as const,
    requirement: 20,
    secret: true,
  },
];

/**
 * Ensure all achievement definitions exist in database
 */
export async function seedAchievements(): Promise<void> {
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    await prisma.achievementDefinition.upsert({
      where: { code: def.code },
      update: {
        title: def.title,
        description: def.description,
        icon: def.icon,
        xpReward: def.xpReward,
        category: def.category,
        requirement: def.requirement,
        secret: def.secret,
      },
      create: def,
    });
  }
}

/**
 * Check and award achievements for a user
 */
export async function checkAndAwardAchievements(
  userId: string
): Promise<AchievementCheckResult> {
  // Ensure achievements are seeded
  await seedAchievements();

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
    throw new Error('User not found');
  }

  // Calculate progress metrics
  const totalQuestsCompleted = user.questAttempts.length;
  const currentStreak = user.currentStreak;
  const currentLevel = user.level;
  
  const completedWorlds = user.worldProgress.filter(
    (wp: any) => wp.questsCompleted === wp.totalQuests && wp.totalQuests > 0
  );

  // Get all achievement definitions
  const allAchievements = await prisma.achievementDefinition.findMany();
  
  // Get already unlocked achievement IDs
  const unlockedAchievementIds = new Set(
    user.userAchievements.map((ua: any) => ua.achievementId)
  );

  // Check which achievements should be awarded
  const newAchievements: Array<{
    achievement: AchievementDefinition;
    xpAwarded: number;
  }> = [];

  for (const achievement of allAchievements) {
    // Skip if already unlocked
    if (unlockedAchievementIds.has(achievement.id)) {
      continue;
    }

    let shouldAward = false;

    // Check conditions based on category
    switch (achievement.category) {
      case 'quest':
        shouldAward = totalQuestsCompleted >= achievement.requirement;
        break;
      
      case 'streak':
        shouldAward = currentStreak >= achievement.requirement;
        break;
      
      case 'world':
        if (achievement.code.startsWith('world_')) {
          // Specific world completion
          const worldId = achievement.code.replace('world_', '').replace(/_/g, '-');
          const worldProgress = user.worldProgress.find((wp: any) => wp.worldId === worldId);
          shouldAward = worldProgress
            ? worldProgress.questsCompleted === worldProgress.totalQuests && worldProgress.totalQuests > 0
            : false;
        } else if (achievement.code === 'first_world') {
          shouldAward = completedWorlds.length >= 1;
        }
        break;
      
      case 'milestone':
        if (achievement.code.startsWith('level_')) {
          const requiredLevel = achievement.requirement;
          shouldAward = currentLevel >= requiredLevel;
        }
        break;
    }

    if (shouldAward) {
      // Award the achievement
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id
        }
      });

      // Award XP
      await prisma.user.update({
        where: { id: userId },
        data: {
          xp: { increment: achievement.xpReward }
        }
      });

      newAchievements.push({
        achievement: achievement as AchievementDefinition,
        xpAwarded: achievement.xpReward
      });
    }
  }

  const totalXPFromAchievements = newAchievements.reduce(
    (sum, na) => sum + na.xpAwarded,
    0
  );

  return {
    newAchievements,
    totalXPFromAchievements
  };
}
