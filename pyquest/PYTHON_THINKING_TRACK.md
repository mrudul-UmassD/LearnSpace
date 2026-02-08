# Python Thinking Quest Track

## Overview
A comprehensive 20-quest learning track focused on Python's mental model and common pitfalls. Unlocks after completing Python Basics (300 XP requirement).

## Quest Breakdown

### Total Statistics
- **Total Quests**: 20
- **Total XP Reward**: 2,210 XP
- **Difficulty Range**: Beginner to Advanced
- **Quest Types**:
  - `code`: 4 quests (implement solutions)
  - `predict_output`: 7 quests (predict stdout)
  - `explain`: 4 quests (write explanations with rubric grading)
  - `debug_fix`: 5 quests (fix buggy code)

## Topics Covered

### 1. Name Binding & Assignment (Quests 1-3)
- **Quest 01**: Bindings Aren't Boxes (predict_output, 80 XP)
  - Demonstrates aliasing vs rebinding
  - Shows `id()` for same object references
  
- **Quest 02**: Explain Name Binding (explain, 100 XP)
  - Rubric: bind, reference, mutate, rebind, immutable
  - Requires contrasting mutation vs rebinding

- **Quest 03**: Rebinding Without Side Effects (code, 120 XP)
  - Implement `increment()` and `append_one()` without mutation
  - Tests verify no side effects on input

### 2. Mutability & Aliasing (Quests 4-7)
- **Quest 04**: Aliasing With Nested Lists (predict_output, 100 XP)
  - Shows `[[0]*3]*3` aliasing bug
  - Demonstrates shared row references

- **Quest 05**: Fix Shared Row Bug (debug_fix, 150 XP)
  - Fix `make_grid()` to create independent rows
  - Tests verify row isolation

- **Quest 06**: Strings Don't Mutate (predict_output, 60 XP)
  - Shows string methods return new strings
  - Demonstrates immutability

- **Quest 07**: Explain Mutability & Aliasing (explain, 120 XP)
  - Rubric: alias, mutable, immutable, side effect, copy
  - Requires concrete aliasing bug example

### 3. LEGB Scope Rules (Quests 8-11)
- **Quest 08**: LEGB in the Wild (predict_output, 90 XP)
  - Nested functions reading from enclosing scope
  - Demonstrates LEGB resolution order

- **Quest 09**: Closure Counter With nonlocal (code, 150 XP)
  - Implement counter using `nonlocal`
  - Tests verify independent counter state

- **Quest 10**: Fix Accidental Global (debug_fix, 130 XP)
  - Fix function creating local instead of updating global
  - Demonstrates `global` keyword usage

- **Quest 11**: Explain LEGB & Assignment (explain, 130 XP)
  - Rubric: LEGB, assignment, UnboundLocalError, global, nonlocal
  - Requires example with error and fix

### 4. Default Mutable Arguments (Quests 12-14)
- **Quest 12**: Default Mutable Argument Trap (predict_output, 100 XP)
  - Shows `def f(acc=[])` sharing state across calls
  - Demonstrates definition-time evaluation

- **Quest 13**: Fix Safe Default (debug_fix, 140 XP)
  - Fix function to use `acc=None` pattern
  - Tests verify no shared state and respect explicit `[]`

- **Quest 14**: Optional Accumulator (code, 110 XP)
  - Implement with `acc=None` and `is None` check
  - Avoid truthiness bug with empty list

### 5. Iteration vs Indexing (Quests 15-17)
- **Quest 15**: Modifying While Iterating (predict_output, 110 XP)
  - Shows skipped elements when removing during iteration
  - Contrasts iterating over copy vs same list

- **Quest 16**: Fix Off-by-One (debug_fix, 90 XP)
  - Fix `range(len(xs)-1)` bug
  - Tests verify all elements processed

- **Quest 17**: Explain Iteration Patterns (explain, 100 XP)
  - Rubric: enumerate, iterate, mutation, copy, list comprehension
  - Safe patterns for filtering/modifying

### 6. Truthiness & Type Coercion (Quests 18-19)
- **Quest 18**: Truthiness Tour (predict_output, 80 XP)
  - Tests `0`, `''`, `'0'`, `[]`, `[0]`, `{}`, `None`
  - Shows empty container vs numeric zero

- **Quest 19**: Validate Blank Input (code, 100 XP)
  - Implement `is_blank()` for `None`/empty/whitespace
  - Avoid truthiness bugs (`'0'` is not blank)

### 7. Shallow vs Deep Copy (Quest 20)
- **Quest 20**: Deep Copy Nested Structures (debug_fix, 150 XP)
  - Fix function doing shallow copy of nested dict/list
  - Tests verify nested independence

## Implementation Details

### Schema Compliance
All quests follow the standard schema:
```typescript
{
  id: string,              // e.g., "python-thinking-01-bindings"
  world: "python-thinking",
  type: "code" | "predict_output" | "explain" | "debug_fix",
  title: string,
  story: string,           // Narrative context
  instructions: string,    // Task description
  starterCode: string,     // Initial code (empty for predict/explain)
  solutionHidden: string,  // Reference solution or hidden code
  tests: array,            // Test cases
  hints: array,            // 3-tier progressive hints
  hintUnlockAttempts: 2,   // Attempts before unlocking next hint
  xpReward: number,        // 60-150 XP range
  difficulty: "beginner" | "intermediate" | "advanced",
  order: 1-20,             // Sequential ordering
  explainRubric?: array    // For explain quests only
}
```

### Quest Loader Integration
- **Location**: `/content/quests/python-thinking/*.json`
- **Loader**: `lib/quest-loader.ts` with recursive directory scanning
- **World Metadata**: Auto-generated with 300 XP unlock requirement
- **Loading**: Automatic on app start via singleton `getQuestLoader()`

### Progression System
1. **Unlock**: Requires 300 XP (complete Python Basics track)
2. **Order**: Quests 1-20 follow pedagogical sequence
3. **Hints**: 3 tiers, unlock after 2 failed attempts
4. **XP Distribution**:
   - Beginner quests: 60-90 XP
   - Intermediate: 100-130 XP
   - Advanced: 140-150 XP

### Grading System

#### Code Quests
- Test-based validation
- Pass/fail ratio determines score
- All tests must pass for 100%

#### Predict Output Quests
- Exact stdout match (normalized whitespace/newlines)
- 100% for correct, 0% for incorrect
- Feedback shows expected vs actual

#### Explain Quests
- Keyword-based rubric grading
- Partial credit via weighted scoring
- Example rubrics:
  - Quest 02: bind (25%), reference (20%), mutate (20%), rebind (15%), immutable (20%)
  - Quest 07: alias (25%), mutable (20%), reference (15%), side effect (20%), copy (20%)

#### Debug Fix Quests
- Test suite validation
- Must fix bug with minimal changes
- Tests verify original behavior + fix

## Testing & Validation

### Schema Validation
- All 20 quests validated against `questDataSchema`
- Zod parsing ensures type safety
- Loader logs errors for invalid quests

### Runtime Constraints
- All code execution via runner service
- 2-second timeout enforced
- Sandboxed Python environment
- No network/filesystem access

### Test Coverage
Each quest includes:
- Positive test cases (expected behavior)
- Edge cases (empty input, None, etc.)
- Negative tests (wrong approach detection)
- Identity/object reference checks where relevant

## Files Created

### Quest Files (20 total)
```
content/quests/python-thinking/
├── 01-bindings-arent-boxes.json
├── 02-explain-name-binding.json
├── 03-rebinding-without-side-effects.json
├── 04-aliasing-nested-lists.json
├── 05-debug-shared-row-bug.json
├── 06-strings-dont-mutate.json
├── 07-explain-mutability-aliasing.json
├── 08-legb-in-the-wild.json
├── 09-closure-counter-nonlocal.json
├── 10-debug-accidental-global.json
├── 11-explain-legb-assignment.json
├── 12-mutable-default-trap.json
├── 13-debug-safe-default.json
├── 14-code-optional-accumulator.json
├── 15-iteration-vs-mutation.json
├── 16-debug-off-by-one.json
├── 17-explain-iteration-patterns.json
├── 18-truthiness-tour.json
├── 19-code-validate-blank.json
└── 20-debug-deep-copy.json
```

### Updated Files
- `lib/quest-loader.ts`: Added recursive directory scanning and world XP requirements
- `components/quest-builder.tsx`: Added missing `type` field to default quest

## Usage

### Access the Track
1. Complete Python Basics (earn 300+ XP)
2. Visit `/worlds` page
3. Click "Python Thinking" world card
4. Select quest from list

### Play a Quest
1. Read story and instructions
2. For `code`/`debug_fix`: Write/fix code in editor
3. For `predict_output`: Enter expected stdout in textarea
4. For `explain`: Write 3-5 sentence explanation
5. Click "Run Tests" / "Check Prediction" / "Submit Explanation"
6. View score, feedback, and unlock hints after 2 attempts

### Progression
- Quests unlock sequentially (order 1-20)
- Complete earlier quests to unlock later ones
- Earn 2,210 total XP for full completion
- Unlock achievements for world completion

## Educational Goals

1. **Mental Model**: Understand Python's name-object binding system
2. **Pitfall Awareness**: Recognize common bugs before writing them
3. **Debugging Skills**: Identify and fix aliasing/scope issues
4. **Best Practices**: Learn Pythonic patterns (enumerate, comprehensions)
5. **Type Intuition**: Reason about mutability without running code

## Next Steps

### For Learners
- Start with Quest 01 (Bindings Aren't Boxes)
- Read hints progressively if stuck
- Try explaining concepts to solidify understanding
- Aim for 100% on predict_output quests (precision matters!)

### For Instructors
- Monitor explain quest submissions for conceptual gaps
- Review rubric keyword matches for partial credit tuning
- Add follow-up quests for struggling topics
- Consider pair programming for debug_fix quests

### For Developers
- Add similar tracks: "Python Performance", "Pythonic Patterns"
- Implement quest analytics (avg attempts, time spent)
- Add hint effectiveness tracking
- Consider adaptive difficulty based on performance
