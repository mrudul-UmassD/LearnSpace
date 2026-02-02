import { questsData } from '@/content/quests/beginner-quests';
import { QuestList } from '@/components/quest/quest-list';
import { NavBar } from '@/components/nav-bar';

export default function QuestsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Python Quests</h1>
          <p className="text-gray-600">
            Choose your quest and start your Python learning adventure
          </p>
        </div>

        <QuestList quests={questsData as any} />
      </main>
    </div>
  );
}
