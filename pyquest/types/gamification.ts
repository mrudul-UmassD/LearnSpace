// Game mechanics types

export interface UserStats {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalQuestsCompleted: number;
  totalWorldsCompleted: number;
  achievementsUnlocked: number;
  lastLoginDate: Date | null;
}

export interface AchievementDefinition {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  category: 'quest' | 'streak' | 'world' | 'milestone';
  requirement: number;
  secret: boolean;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  achievement: AchievementDefinition;
  unlockedAt: Date;
}

export interface AchievementProgress {
  achievement: AchievementDefinition;
  unlocked: boolean;
  unlockedAt: Date | null;
  progress: number; // Current progress towards requirement
  requirement: number; // What's needed to unlock
}

export interface XPGain {
  amount: number;
  source: 'quest' | 'achievement' | 'streak_bonus';
  details: string;
  leveledUp: boolean;
  newLevel?: number;
}

export interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  isNewRecord: boolean;
  streakBonus: number; // XP bonus for maintaining streak
}

// Level calculation utilities
export function calculateLevel(xp: number): number {
  // Formula: level = floor(sqrt(xp / 100)) + 1
  // This means: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 400 XP, Level 4 = 900 XP, etc.
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getXPForLevel(level: number): number {
  // Inverse of calculateLevel
  return (level - 1) ** 2 * 100;
}

export function getXPToNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  return nextLevelXP - currentXP;
}

export function getProgressToNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const progress = (currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP);
  return Math.max(0, Math.min(1, progress));
}
