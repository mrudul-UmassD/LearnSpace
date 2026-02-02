import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/nav-bar';

export default function MapPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

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
