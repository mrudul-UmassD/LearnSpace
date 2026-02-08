import { z } from 'zod';

// Test types schema
export const questTestSchema = z.object({
  id: z.string().min(1, 'Test ID is required'),
  type: z.enum([
    'output',
    'variable_exists',
    'variable_type',
    'variable_value',
    'function_call',
    'list_contains',
    'list_length',
  ]),
  description: z.string().min(1, 'Description is required'),
  expectedBehavior: z.string().min(1, 'Expected behavior is required'),
  expected: z.any().optional(),
  variable: z.string().optional(),
  expectedType: z.string().optional(),
  function: z.string().optional(),
  args: z.array(z.any()).optional(),
});

// Component test schema for React component quests
export const componentTestSchema = z.object({
  id: z.string().min(1, 'Test ID is required'),
  type: z.enum([
    'renders',           // Component renders without error
    'contains_text',     // DOM contains specific text
    'contains_element',  // DOM contains element by role/testid
    'has_attribute',     // Element has specific attribute
    'snapshot',          // DOM structure matches snapshot
    'event_handler',     // Event triggers expected behavior
  ]),
  description: z.string().min(1, 'Test description is required'),
  selector: z.string().optional(), // CSS selector or testId
  role: z.string().optional(),     // ARIA role (button, heading, etc.)
  text: z.string().optional(),      // Expected text content
  attribute: z.string().optional(), // Attribute name
  value: z.string().optional(),     // Expected attribute value
  event: z.string().optional(),     // Event type (click, change, etc.)
  expectedAfterEvent: z.string().optional(), // Expected text after event
  snapshot: z.string().optional(),  // Expected HTML snapshot (minified)
});

// Hint schema
export const questHintSchema = z.object({
  level: z.number().int().positive(),
  text: z.string().min(1, 'Hint text is required'),
});

// Main quest data schema
export const questDataSchema = z.object({
  id: z
    .string()
    .min(1, 'Quest ID is required')
    .regex(/^[a-z0-9-]+$/, 'Quest ID must be lowercase with hyphens only'),
  world: z.string().min(1, 'World is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  story: z.string().min(1, 'Story is required').max(1000, 'Story too long'),
  instructions: z.string().min(1, 'Instructions are required').max(1000, 'Instructions too long'),
  type: z.enum(['code', 'predict_output', 'explain', 'debug_fix', 'trace_reading', 'component']).default('code'),
  starterCode: z.string(),
  solutionHidden: z.string(),
  tests: z.array(questTestSchema),
  componentTests: z.array(componentTestSchema).optional(), // For component quests
  hints: z.array(questHintSchema).min(1, 'At least one hint is required'),
  hintUnlockAttempts: z.number().int().min(1).max(10),
  xpReward: z.number().int().min(1).max(1000),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  order: z.number().int().min(1),
  debugFix: z
    .object({
      maxChangedLines: z.number().int().min(1).max(200).default(6),
    })
    .optional(),
  dataset: z
    .object({
      files: z
        .array(
          z.object({
            name: z.string().min(1).max(128),
            content: z.string().min(1).max(64 * 1024),
          })
        )
        .min(1)
        .max(5),
    })
    .optional(),
  explainRubric: z
    .array(
      z.object({
        keywords: z.array(z.string().min(1)).min(1),
        weight: z.number().positive().max(10).default(1),
        description: z.string().optional(),
      })
    )
    .optional(),
  traceReading: z
    .object({
      stackTrace: z.string().min(1, 'Stack trace is required'),
      buggyCode: z.string().min(1, 'Buggy code is required'),
      questions: z
        .array(
          z.object({
            id: z.string().min(1),
            type: z.enum(['multiple_choice', 'short_text']),
            question: z.string().min(1, 'Question text is required'),
            options: z.array(z.string().min(1)).optional(),
            correctAnswer: z.string().min(1, 'Correct answer is required'),
            keywords: z.array(z.string().min(1)).optional(),
            points: z.number().int().positive().default(1),
          })
        )
        .min(1, 'At least one question is required')
        .max(10),
    })
    .optional(),
});

export type QuestData = z.infer<typeof questDataSchema>;
export type QuestTest = z.infer<typeof questTestSchema>;
export type ComponentTest = z.infer<typeof componentTestSchema>;
export type QuestHint = z.infer<typeof questHintSchema>;
