'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorldWithProgress } from '@/types/quest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export function WorldMap() {
  const [worlds, setWorlds] = useState<WorldWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/worlds')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch worlds');
        return res.json();
      })
      .then(data => {
        setWorlds(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading worlds:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading worlds...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center space-y-8">
      <div className="absolute inset-0 flex justify-center items-center">
        <svg className="w-full h-full max-w-4xl" viewBox="0 0 100 100" preserveAspectRatio="none">
          {worlds.map((world, index) => (
            <line
              key={world.id}
              x1={(index / worlds.length) * 100}
              y1="50"
              x2={((index + 1) / worlds.length) * 100}
              y2="50"
              stroke={world.isUnlocked ? '#4ade80' : '#d1d5db'}
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {worlds.map((world, index) => (
          <motion.div
            key={world.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`transition-all hover:shadow-lg ${
                world.isUnlocked ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{world.name}</CardTitle>
                  {!world.isUnlocked && <span className="text-2xl">🔒</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{world.description}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">
                      {world.completedQuests} / {world.totalQuests} quests
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(world.completedQuests / world.totalQuests) * 100}%`,
                      }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(world.completedQuests / world.totalQuests) * 100}%`,
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">XP Earned</span>
                  <span className="font-medium text-yellow-600">{world.earnedXP} XP</span>
                </div>

                {world.requiredXP && !world.isUnlocked && (
                  <div className="text-sm text-gray-500 italic">
                    Requires {world.requiredXP} XP to unlock
                  </div>
                )}

                <Link href={`/worlds/${world.id}`}>
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={!world.isUnlocked}
                  >
                    {world.isUnlocked ? 'Enter World' : 'Locked'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
