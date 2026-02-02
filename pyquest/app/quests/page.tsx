import { questsData } from '@/content/quests/beginner-quests';
import { QuestList } from '@/components/quest/quest-list';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function QuestsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PyQuest
            </h1>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/quests">
              <Button variant="ghost">Quests</Button>
            </Link>
            <Link href="/map">
              <Button variant="ghost">Map</Button>
            </Link>
            <Button variant="primary">Sign In</Button>
          </div>
        </nav>
      </header>

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
