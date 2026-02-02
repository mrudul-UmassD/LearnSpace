'use client';

import { QuestCard } from './quest-card';
import type { Quest } from '@/types/quest';

interface QuestListProps {
  quests: Quest[];
}

export function QuestList({ quests }: QuestListProps) {
  const groupedQuests = quests.reduce(
    (acc, quest) => {
      if (!acc[quest.category]) {
        acc[quest.category] = [];
      }
      acc[quest.category].push(quest);
      return acc;
    },
    {} as Record<string, Quest[]>
  );

  return (
    <div className="space-y-8">
      {Object.entries(groupedQuests).map(([category, categoryQuests]) => (
        <div key={category}>
          <h2 className="text-2xl font-bold mb-4 capitalize">{category.replace('-', ' ')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryQuests.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onStart={() => (window.location.href = `/quests/${quest.id}`)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
