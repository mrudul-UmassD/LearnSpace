import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MapPage() {
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
          <h1 className="text-4xl font-bold mb-2">Quest Map</h1>
          <p className="text-gray-600">Navigate your Python learning journey</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 min-h-[600px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-2xl font-bold mb-2">Interactive Quest Map</h2>
            <p className="text-gray-600 mb-4">
              The interactive quest map is coming soon! It will show your learning path and progress
              across different Python topics.
            </p>
            <Link href="/quests">
              <Button variant="primary">View All Quests</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
