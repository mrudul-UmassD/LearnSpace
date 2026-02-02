'use client';

import { useEffect, useState } from 'react';
import { AchievementProgress } from '@/types/gamification';

interface AchievementsDisplayProps {
  refreshTrigger?: number;
}

export function AchievementsDisplay({ refreshTrigger }: AchievementsDisplayProps) {
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    async function fetchAchievements() {
      try {
        setLoading(true);
        const response = await fetch('/api/achievements');
        
        if (!response.ok) {
          throw new Error('Failed to fetch achievements');
        }

        const data = await response.json();
        setAchievements(data.achievements);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load achievements');
      } finally {
        setLoading(false);
      }
    }

    fetchAchievements();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  const filteredAchievements = achievements.filter(a => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Achievements</h2>
          <p className="text-gray-400 text-sm">
            {unlockedCount} of {totalCount} unlocked
          </p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unlocked'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Unlocked
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'locked'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Locked
          </button>
        </div>
      </div>

      {/* Achievement Categories */}
      {['quest', 'streak', 'world', 'milestone'].map(category => {
        const categoryAchievements = filteredAchievements.filter(
          a => a.achievement.category === category
        );
        
        if (categoryAchievements.length === 0) return null;

        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-300 capitalize">
              {categoryName} Achievements
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryAchievements.map(achievement => (
                <AchievementCard key={achievement.achievement.id} achievement={achievement} />
              ))}
            </div>
          </div>
        );
      })}

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-xl mb-2">🎯</p>
          <p>No achievements in this category yet.</p>
        </div>
      )}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementProgress }) {
  const { achievement: def, unlocked, unlockedAt, progress, requirement } = achievement;
  const progressPercent = (progress / requirement) * 100;

  return (
    <div className={`
      rounded-lg p-4 border-2 transition-all
      ${unlocked
        ? 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-yellow-600/50'
        : 'bg-gray-800 border-gray-700'
      }
    `}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`
          text-4xl flex-shrink-0
          ${unlocked ? '' : 'grayscale opacity-50'}
        `}>
          {def.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-semibold ${unlocked ? 'text-yellow-300' : 'text-gray-300'}`}>
              {def.title}
            </h4>
            {unlocked && (
              <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                ✓ Unlocked
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-400 mb-3">
            {def.description}
          </p>

          {/* Progress Bar */}
          {!unlocked && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progress: {progress} / {requirement}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Unlocked Date */}
          {unlocked && unlockedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Unlocked {new Date(unlockedAt).toLocaleDateString()}
            </p>
          )}

          {/* XP Reward */}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-yellow-400 text-sm">⭐</span>
            <span className="text-xs text-gray-400">+{def.xpReward} XP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
