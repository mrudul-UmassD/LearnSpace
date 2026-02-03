import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function WorldsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const questLoader = getQuestLoader();
  const worlds = questLoader.getAllWorlds();

  // Get user's world progress
  const worldProgress = await prisma.worldProgress.findMany({
    where: { userId: session.user.id }
  });

  const progressMap = new Map(worldProgress.map(wp => [wp.worldId, wp]));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Learning Worlds</h1>
          <p className="text-gray-600">Choose your Python learning path</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {worlds.map((world) => {
            const progress = progressMap.get(world.id);
            const completionPercentage = progress 
              ? Math.round((progress.questsCompleted / world.totalQuests) * 100)
              : 0;
            const isUnlocked = progress?.isUnlocked !== false;

            return (
              <Card 
                key={world.id} 
                className={`hover:shadow-lg transition-all ${!isUnlocked ? 'opacity-60' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl">{world.name}</CardTitle>
                    {!isUnlocked && (
                      <span className="text-2xl">🔒</span>
                    )}
                  </div>
                  <CardDescription>{world.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{completionPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {progress?.questsCompleted || 0} / {world.totalQuests} Quests
                      </span>
                      <span className="text-yellow-600 font-medium">
                        {progress?.xpEarned || 0} XP
                      </span>
                    </div>

                    {/* Action Button */}
                    <Link href={`/worlds/${world.id}`}>
                      <Button 
                        className="w-full"
                        disabled={!isUnlocked}
                      >
                        {!isUnlocked ? 'Locked' : 
                         completionPercentage === 0 ? 'Start' : 
                         completionPercentage === 100 ? 'Review' : 
                         'Continue'}
                      </Button>
                    </Link>

                    {!isUnlocked && world.requiredXP && (
                      <p className="text-xs text-gray-500 text-center">
                        Requires {world.requiredXP} XP to unlock
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {worlds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No worlds available yet.</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
