'use client';

import { useEffect, useState } from 'react';
import { UserStats, AchievementProgress } from '@/types/gamification';
import { 
  calculateLevel, 
  getXPForLevel, 
  getXPToNextLevel, 
  getProgressToNextLevel 
} from '@/types/gamification';

interface UserStatsDisplayProps {
  refreshTrigger?: number;
}

export function UserStatsDisplay({ refreshTrigger }: UserStatsDisplayProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch('/api/user/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data.stats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error || 'No stats available'}</p>
      </div>
    );
  }

  const xpToNextLevel = getXPToNextLevel(stats.xp);
  const progressPercent = getProgressToNextLevel(stats.xp) * 100;
  const currentLevelXP = getXPForLevel(stats.level);
  const nextLevelXP = getXPForLevel(stats.level + 1);

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 shadow-xl">
      {/* Level and XP */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold text-yellow-400">
              Level {stats.level}
            </div>
            <div className="text-sm text-gray-400">
              {stats.xp.toLocaleString()} XP
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {xpToNextLevel} XP to next level
          </div>
        </div>
        
        {/* XP Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{currentLevelXP} XP</span>
          <span>{nextLevelXP} XP</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-2xl font-bold text-orange-400">{stats.currentStreak}</div>
          <div className="text-xs text-gray-400">Day Streak</div>
          {stats.longestStreak > stats.currentStreak && (
            <div className="text-xs text-gray-500 mt-1">
              Best: {stats.longestStreak}
            </div>
          )}
        </div>

        {/* Quests Completed */}
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-3xl mb-1">✅</div>
          <div className="text-2xl font-bold text-green-400">{stats.totalQuestsCompleted}</div>
          <div className="text-xs text-gray-400">Quests Done</div>
        </div>

        {/* Worlds Completed */}
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-3xl mb-1">🌍</div>
          <div className="text-2xl font-bold text-blue-400">{stats.totalWorldsCompleted}</div>
          <div className="text-xs text-gray-400">Worlds Done</div>
        </div>

        {/* Achievements */}
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-2xl font-bold text-purple-400">{stats.achievementsUnlocked}</div>
          <div className="text-xs text-gray-400">Achievements</div>
        </div>
      </div>
    </div>
  );
}
