import { prisma } from '@/lib/db/prisma';
import type { Quest, UserProgress } from '@/types/quest';

export class QuestService {
  static async getAllQuests(): Promise<Quest[]> {
    return prisma.quest.findMany({
      where: { isPublished: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
  }

  static async getQuestById(id: string) {
    return prisma.quest.findUnique({
      where: { id },
      include: { challenges: { orderBy: { order: 'asc' } } },
    });
  }

  static async getUserProgress(userId: string): Promise<UserProgress[]> {
    return prisma.userProgress.findMany({
      where: { userId },
      include: { quest: true },
    });
  }

  static async updateProgress(
    userId: string,
    questId: string,
    completed: boolean,
    score: number
  ) {
    return prisma.userProgress.upsert({
      where: {
        userId_questId: { userId, questId },
      },
      update: {
        completed,
        score,
        attempts: { increment: 1 },
        lastAttempt: new Date(),
      },
      create: {
        userId,
        questId,
        completed,
        score,
        attempts: 1,
      },
    });
  }
}
