import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';
import { prisma } from '@/lib/db/prisma';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { QuestWorkspace } from '@/components/quest-workspace';

interface QuestPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuestPage({ params }: QuestPageProps) {
  const session = await auth();
  const { id } = await params;
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const questLoader = getQuestLoader();
  const quest = questLoader.getQuestById(id);
  
  if (!quest) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Quest Not Found</h1>
            <Link href="/map">
              <Button variant="primary">Back to Map</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Get user's attempt for this quest
  const attempt = await prisma.questAttempt.findUnique({
    where: {
      userId_questId: {
        userId: session.user.id,
        questId: id
      }
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href={`/worlds/${quest.world}`}>
            <Button variant="outline">
              ← Back to {quest.world.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </Button>
          </Link>
        </div>

        <QuestWorkspace 
          quest={quest} 
          initialCode={attempt?.lastCode || quest.starterCode}
          attempt={attempt}
        />
      </main>
    </div>
  );
}
