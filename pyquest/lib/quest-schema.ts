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
  starterCode: z.string(),
  solutionHidden: z.string().min(1, 'Solution is required'),
  tests: z.array(questTestSchema).min(1, 'At least one test is required'),
  hints: z.array(questHintSchema).min(1, 'At least one hint is required'),
  hintUnlockAttempts: z.number().int().min(1).max(10),
  xpReward: z.number().int().min(1).max(1000),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  order: z.number().int().min(1),
});

export type QuestData = z.infer<typeof questDataSchema>;
export type QuestTest = z.infer<typeof questTestSchema>;
export type QuestHint = z.infer<typeof questHintSchema>;
