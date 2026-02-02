import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { NavBar } from '@/components/nav-bar';
import { WorldMap } from '@/components/world-map';

export default async function MapPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Quest Map</h1>
          <p className="text-gray-600">Navigate your Python learning journey</p>
        </div>

        <WorldMap />
      </main>
    </div>
  );
}
