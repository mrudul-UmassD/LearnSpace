export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  order: number;
  xpReward: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Challenge {
  id: string;
  questId: string;
  title: string;
  description: string;
  starterCode: string;
  solution: string;
  testCases: TestCase[];
  hints?: string[];
  order: number;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  questId: string;
  completed: boolean;
  score: number;
  attempts: number;
  lastAttempt: Date;
}
