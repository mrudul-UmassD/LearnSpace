import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorldPageProps {
  params: Promise<{ worldId: string }>;
}

export default async function WorldPage({ params }: WorldPageProps) {
  const session = await auth();
  const { worldId } = await params;
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const questLoader = getQuestLoader();
  const world = questLoader.getWorld(worldId);
  
  if (!world) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">World Not Found</h1>
            <Link href="/map">
              <Button variant="primary">Back to Map</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const quests = questLoader.getQuestsByWorld(worldId);
  
  // Get user's attempts for these quests
  const attempts = await prisma.questAttempt.findMany({
    where: {
      userId: session.user.id,
      questId: { in: quests.map(q => q.id) }
    }
  });

  const attemptsMap = new Map(attempts.map(a => [a.questId, a]));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/map">
            <Button variant="outline" className="mb-4">
              ← Back to Map
            </Button>
          </Link>
          
          <h1 className="text-4xl font-bold mb-2">{world.name}</h1>
          <p className="text-gray-600">{world.description}</p>
        </div>

        <div className="space-y-4">
          {quests.map((quest, index) => {
            const attempt = attemptsMap.get(quest.id);
            const isCompleted = attempt?.status === 'completed';
            const isInProgress = attempt?.status === 'in_progress';
            
            return (
              <Card key={quest.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-400">
                        #{index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{quest.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            quest.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                            quest.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {quest.difficulty}
                          </span>
                          <span className="text-sm text-yellow-600 font-medium">
                            {quest.xpReward} XP
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {isCompleted && (
                      <span className="text-3xl">✅</span>
                    )}
                    {isInProgress && !isCompleted && (
                      <span className="text-3xl">🔄</span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-600 mb-4">{quest.story}</p>
                  
                  {attempt && (
                    <div className="mb-4 text-sm text-gray-600">
                      <span>Attempts: {attempt.attemptsCount}</span>
                      {attempt.passed && (
                        <span className="ml-4 text-green-600 font-medium">
                          Passed ✓
                        </span>
                      )}
                    </div>
                  )}
                  
                  <Link href={`/quests/${quest.id}`}>
                    <Button variant="primary">
                      {isCompleted ? 'Review Quest' : isInProgress ? 'Continue' : 'Start Quest'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
