import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { UserStatsDisplay } from '@/components/user-stats';
import { AchievementsDisplay } from '@/components/achievements-display';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Fetch user progress
  const userProgress = await prisma.userProgress.findMany({
    where: { userId: session.user.id },
    include: { quest: true },
    orderBy: { lastAttempt: 'desc' },
  });

  const totalQuests = await prisma.quest.count({ where: { isPublished: true } });
  const completedQuests = userProgress.filter((p: any) => p.completed).length;
  const totalXP = userProgress.reduce((sum: number, p: any) => sum + p.score, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PyQuest
            </h1>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/worlds">
              <Button variant="ghost" className="text-white hover:text-blue-400">Worlds</Button>
            </Link>
            <Link href="/map">
              <Button variant="ghost" className="text-white hover:text-blue-400">Map</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="text-white hover:text-blue-400">Dashboard</Button>
            </Link>
            <SignOutButton />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {session.user.name || 'Learner'}! 👋
          </h1>
          <p className="text-gray-400">Track your progress and continue your Python journey</p>
        </div>

        {/* User Stats - Gamification */}
        <UserStatsDisplay />

        {/* Achievements Section */}
        <div className="mt-12">
          <AchievementsDisplay />
        </div>

        {/* Recent Activity */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-gray-400">Your latest quest attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {userProgress.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">You haven't started any quests yet!</p>
                <Link href="/worlds">
                  <Button className="bg-blue-600 hover:bg-blue-700">Browse Worlds</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userProgress.slice(0, 5).map((progress: any) => (
                  <div
                    key={progress.id}
                    className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{progress.quest.title}</h3>
                      <p className="text-sm text-gray-400">
                        {progress.completed ? '✅ Completed' : '🔄 In Progress'} • Score:{' '}
                        {progress.score} XP • {progress.attempts} attempts
                      </p>
                    </div>
                    <Link href={`/quests/${progress.questId}`}>
                      <Button variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-700">
                        {progress.completed ? 'Review' : 'Continue'}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
