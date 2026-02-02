'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Quest } from '@/types/quest';

interface QuestCardProps {
  quest: Quest;
  onStart?: () => void;
}

export function QuestCard({ quest, onStart }: QuestCardProps) {
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{quest.title}</CardTitle>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyColors[quest.difficulty]}`}
          >
            {quest.difficulty}
          </span>
        </div>
        <CardDescription>{quest.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-blue-600">{quest.xpReward} XP</span> • Category:{' '}
            {quest.category}
          </div>
          <Button variant="primary" size="sm" onClick={onStart}>
            Start Quest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
