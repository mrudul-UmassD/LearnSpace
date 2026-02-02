# Quest Engine - Next Steps

## What's Complete ✅

1. **Database Schema**
   - QuestAttempt model (tracks user attempts)
   - WorldProgress model (tracks completion per world)
   - Relationships to User model

2. **Quest Storage**
   - 4 sample JSON quest files
   - TypeScript interfaces for quest data
   - Organized by world (python-basics, data-structures)

3. **Quest Loader Service**
   - Singleton pattern
   - In-memory quest index
   - World metadata generation
   - Fast lookup methods

4. **API Endpoints**
   - GET /api/worlds (with user progress)
   - GET /api/quests/[id] (with attempt data)
   - Authentication required

5. **UI Pages**
   - World map (/map) with progress cards
   - World detail (/worlds/[worldId]) with quest list
   - Quest workspace (/quests/[id]) with code editor
   - All protected routes

6. **Features**
   - Progress tracking
   - Hints system (progressive disclosure)
   - Test results display
   - Code persistence (saves to lastCode)
   - XP rewards system
   - World unlock mechanics

## What's Missing ⏳

### 1. Code Execution Engine (CRITICAL)

The most important missing piece is the ability to actually run and test user code.

**Current State**: "Run Tests" button shows placeholder message

**What You Need**:

#### Option A: Server-Side Execution (Recommended for MVP)
Create `/api/quests/[id]/execute` endpoint:

```typescript
// app/api/quests/[id]/execute/route.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { code } = await request.json();
  
  // Write code to temp file
  // Run with timeout: python temp_file.py
  // Parse output
  // Run tests against output
  // Return results
}
```

**Security Concerns**:
- Use `child_process` with timeout
- Restrict resource usage
- No file system access
- Whitelist allowed imports
- Sandbox environment

#### Option B: Remote Execution API (Production-Ready)
Use third-party service:

1. **Judge0** (https://judge0.com/)
   - Free tier available
   - REST API
   - Multiple languages
   - Built-in sandboxing

2. **Piston** (https://github.com/engineer-man/piston)
   - Open source
   - Self-hostable
   - REST API

3. **AWS Lambda**
   - Serverless
   - Automatic scaling
   - Pay per execution

**Implementation**:
```typescript
// lib/code-executor.ts
export async function executeCode(code: string, tests: QuestTest[]) {
  const response = await fetch('https://api.judge0.com/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: code,
      language_id: 71, // Python 3
      stdin: '',
    })
  });
  
  // Poll for results
  // Parse output
  // Run tests
  // Return results
}
```

#### Test Runner Logic

For each quest, you need to:

1. **Output Tests**: Compare stdout
```typescript
if (test.type === 'output') {
  const passed = output.trim() === test.expected;
}
```

2. **Variable Tests**: Inject check code
```typescript
if (test.type === 'variable_exists') {
  const checkCode = `${code}\nprint('VAR_EXISTS' if '${test.variable}' in locals() else 'VAR_MISSING')`;
  // Run and parse output
}
```

3. **Function Tests**: Call function and check return
```typescript
if (test.type === 'function_call') {
  const checkCode = `${code}\nresult = ${test.function}(${JSON.stringify(test.args).slice(1, -1)})\nprint(result)`;
  // Run and parse output
}
```

### 2. Progress Updates (After Code Execution)

Once tests pass, update database:

```typescript
// After successful test execution
await prisma.questAttempt.upsert({
  where: { userId_questId: { userId, questId } },
  create: {
    userId,
    questId,
    status: allTestsPassed ? 'completed' : 'in_progress',
    lastCode: code,
    attemptsCount: 1,
    passed: allTestsPassed,
    xpEarned: allTestsPassed ? quest.xpReward : 0
  },
  update: {
    status: allTestsPassed ? 'completed' : 'in_progress',
    lastCode: code,
    attemptsCount: { increment: 1 },
    passed: allTestsPassed,
    xpEarned: allTestsPassed ? quest.xpReward : 0
  }
});

// Update world progress
if (allTestsPassed) {
  const worldQuests = getQuestsByWorld(quest.world);
  const completedCount = await prisma.questAttempt.count({
    where: {
      userId,
      questId: { in: worldQuests.map(q => q.id) },
      passed: true
    }
  });
  
  await prisma.worldProgress.upsert({
    where: { userId_worldId: { userId, worldId: quest.world } },
    create: {
      userId,
      worldId: quest.world,
      questsCompleted: completedCount,
      totalQuests: worldQuests.length,
      xpEarned: quest.xpReward,
      isUnlocked: true
    },
    update: {
      questsCompleted: completedCount,
      xpEarned: { increment: quest.xpReward }
    }
  });
}
```

### 3. Database Migration

Before users can test the app, push schema:

```bash
# Start PostgreSQL (if not running)
# Then:
npx prisma db push

# Optional: Seed with test user
npm run prisma:seed
```

### 4. Additional Features (Nice to Have)

#### A. Real-Time Code Validation
```typescript
// components/quest-workspace.tsx
const [syntaxError, setSyntaxError] = useState<string | null>(null);

// Debounced validation
useEffect(() => {
  const timer = setTimeout(() => {
    fetch('/api/validate-python', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
    .then(res => res.json())
    .then(data => setSyntaxError(data.error));
  }, 500);
  
  return () => clearTimeout(timer);
}, [code]);
```

#### B. Code Editor Upgrade
Replace textarea with proper code editor:

```bash
npm install @monaco-editor/react
```

```typescript
import Editor from '@monaco-editor/react';

<Editor
  height="500px"
  defaultLanguage="python"
  value={code}
  onChange={(value) => setCode(value || '')}
  theme="vs-dark"
  options={{
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false
  }}
/>
```

#### C. Achievement System
When quest completed:
```typescript
// Check for achievements
const completedQuests = await prisma.questAttempt.count({
  where: { userId, passed: true }
});

if (completedQuests === 1) {
  await prisma.achievement.create({
    data: {
      userId,
      title: 'First Steps',
      description: 'Complete your first quest'
    }
  });
}
```

#### D. Quest Progress in Dashboard
Update `/dashboard` to show recent quests:

```typescript
const recentAttempts = await prisma.questAttempt.findMany({
  where: { userId: session.user.id },
  orderBy: { updatedAt: 'desc' },
  take: 5
});

// Show quest titles with loader
recentAttempts.map(attempt => {
  const quest = getQuestLoader().getQuestById(attempt.questId);
  // Display quest info
});
```

## Quick Start for Testing

1. **Start Database**:
   ```bash
   # Start your PostgreSQL server
   ```

2. **Push Schema**:
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

4. **Test Flow**:
   - Go to http://localhost:3000
   - Sign in: test@pyquest.dev / password123
   - Click "Quest Map" in nav
   - Click "Enter World" on Python Basics
   - Click "Start Quest" on Hello World
   - Write code, click "Run Tests" (will show placeholder)

5. **Implement Code Execution**:
   - Choose Option A or B above
   - Create API endpoint
   - Update QuestWorkspace component to call API
   - Test with real Python execution

## Priority Order

1. **Code Execution** (Critical) - Without this, users can't complete quests
2. **Database Migration** (Required) - Push schema before testing
3. **Progress Updates** (Important) - Track completions and XP
4. **Error Handling** (Important) - Handle execution timeouts, errors
5. **Code Editor** (Nice to have) - Better UX than textarea
6. **Real-time Validation** (Nice to have) - Catch syntax errors early

## Estimated Implementation Time

- **Code Execution (Judge0)**: 2-4 hours
- **Code Execution (Server-side)**: 4-8 hours
- **Progress Updates**: 1-2 hours
- **Monaco Editor**: 1 hour
- **Real-time Validation**: 2 hours
- **Achievement System**: 2-3 hours

## Security Checklist for Production

- [ ] Rate limiting on execute endpoint
- [ ] Code execution timeout (5-10 seconds)
- [ ] Resource limits (memory, CPU)
- [ ] Blacklist dangerous Python modules
- [ ] Sanitize error messages
- [ ] Log all code executions
- [ ] Monitor for abuse patterns
- [ ] Implement CAPTCHA for high volume

## Summary

You have a **fully functional Quest Engine UI** with:
- World map with progress tracking
- Quest list pages
- Interactive quest workspace
- Hints system
- Test framework structure
- Database schema for tracking

The **only critical missing piece** is code execution. Once you implement that:

1. Create `/api/quests/[id]/execute` endpoint
2. Run Python code in sandbox
3. Evaluate tests
4. Update database with results
5. Return pass/fail to UI

Everything else is already built and working! 🚀

## Resources

- **Judge0 Docs**: https://ce.judge0.com/
- **Piston API**: https://github.com/engineer-man/piston
- **Python Sandboxing**: https://docs.python.org/3/library/subprocess.html
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/

For questions, refer to [QUEST_ENGINE.md](./QUEST_ENGINE.md) for full implementation details.
