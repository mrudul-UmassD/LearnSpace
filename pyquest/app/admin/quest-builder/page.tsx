import { QuestBuilder } from '@/components/quest-builder';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function QuestBuilderPage() {
  const session = await auth();

  // Protect the page - only authenticated users can access
  if (!session) {
    redirect('/auth/signin?callbackUrl=/admin/quest-builder');
  }

  return (
    <div>
      <QuestBuilder />
    </div>
  );
}
