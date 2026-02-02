import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from '@/components/auth/sign-out-button';

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
  const completedQuests = userProgress.filter(p => p.completed).length;
  const totalXP = userProgress.reduce((sum, p) => sum + p.score, 0);

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
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <SignOutButton />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {session.user.name || 'Learner'}! 👋
          </h1>
          <p className="text-gray-600">Track your progress and continue your Python journey</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardDescription>Total XP</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{totalXP}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Keep learning to earn more XP!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Quests Completed</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {completedQuests} / {totalQuests}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: totalQuests > 0 ? `${(completedQuests / totalQuests) * 100}%` : '0%',
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Total Attempts</CardDescription>
              <CardTitle className="text-3xl text-purple-600">
                {userProgress.reduce((sum, p) => sum + p.attempts, 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Practice makes perfect!</p>
            </CardContent>
          </Card>
        </div>

        {/* Profile Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <p className="text-lg">{session.user.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-lg">{session.user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Member since</label>
              <p className="text-lg">{new Date(session.user.createdAt || Date.now()).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest quest attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {userProgress.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't started any quests yet!</p>
                <Link href="/quests">
                  <Button variant="primary">Browse Quests</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userProgress.slice(0, 5).map(progress => (
                  <div
                    key={progress.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{progress.quest.title}</h3>
                      <p className="text-sm text-gray-600">
                        {progress.completed ? '✅ Completed' : '🔄 In Progress'} • Score:{' '}
                        {progress.score} XP • {progress.attempts} attempts
                      </p>
                    </div>
                    <Link href={`/quests/${progress.questId}`}>
                      <Button variant="outline" size="sm">
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
