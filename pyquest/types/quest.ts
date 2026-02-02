// JSON-based quest types
export interface QuestTest {
  type: 'output' | 'variable_exists' | 'variable_type' | 'variable_value' | 'function_call' | 'list_contains' | 'list_length';
  description: string;
  expected?: any;
  variable?: string;
  expectedType?: string;
  function?: string;
  args?: any[];
}

export interface QuestHint {
  level: number;
  text: string;
}

export interface QuestData {
  id: string;
  world: string;
  title: string;
  story: string;
  instructions: string;
  starterCode: string;
  solutionHidden: string;
  tests: QuestTest[];
  hints: QuestHint[];
  xpReward: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order: number;
}

export interface WorldData {
  id: string;
  name: string;
  description: string;
  totalQuests: number;
  requiredXP?: number;
}

export interface WorldWithProgress extends WorldData {
  completedQuests: number;
  earnedXP: number;
  isUnlocked: boolean;
}

// Legacy database types (kept for backward compatibility)
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
