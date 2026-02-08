// JSON-based quest types
export interface QuestTest {
  id: string;
  type: 'output' | 'variable_exists' | 'variable_type' | 'variable_value' | 'function_call' | 'list_contains' | 'list_length';
  description: string;
  expectedBehavior: string;
  expected?: any;
  variable?: string;
  expectedType?: string;
  function?: string;
  args?: any[];
}

export interface ComponentTest {
  id: string;
  type: 'renders' | 'contains_text' | 'contains_element' | 'has_attribute' | 'snapshot' | 'event_handler';
  description: string;
  selector?: string;
  role?: string;
  text?: string;
  attribute?: string;
  value?: string;
  event?: string;
  expectedAfterEvent?: string;
  snapshot?: string;
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
  type: 'code' | 'predict_output' | 'explain' | 'debug_fix' | 'trace_reading' | 'component';
  starterCode: string;
  solutionHidden: string;
  tests: QuestTest[];
  componentTests?: ComponentTest[];
  hints: QuestHint[];
  hintUnlockAttempts: number;
  xpReward: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order: number;
  debugFix?: {
    maxChangedLines?: number;
  };
  dataset?: {
    files: Array<{
      name: string;
      content: string;
    }>;
  };
  explainRubric?: Array<{
    keywords: string[];
    weight?: number;
    description?: string;
  }>;
  traceReading?: {
    stackTrace: string;
    buggyCode: string;
    questions: Array<{
      id: string;
      type: 'multiple_choice' | 'short_text';
      question: string;
      options?: string[];
      correctAnswer: string;
      keywords?: string[];
      points?: number;
    }>;
  };
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
