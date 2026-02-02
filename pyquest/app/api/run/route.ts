import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestLoader } from '@/lib/quest-loader';

/**
 * Code Execution API - Docker Runner Service
 * 
 * This endpoint proxies code execution requests to the Docker runner service.
 * The runner service provides:
 * - Isolated Docker container execution
 * - No network access for executed code
 * - Read-only filesystem except /tmp
 * - CPU/memory limits (0.5 cores, 256MB)
 * - 2-second timeout
 * - 1MB output limit
 */

const RUNNER_SERVICE_URL = process.env.RUNNER_SERVICE_URL || 'http://runner:8080';
const REQUEST_TIMEOUT = 10000; // 10 seconds for runner service response

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questId, userCode } = await request.json();

    // Validate inputs
    if (!questId || typeof questId !== 'string') {
      return NextResponse.json({ error: 'Invalid questId' }, { status: 400 });
    }

    if (!userCode || typeof userCode !== 'string') {
      return NextResponse.json({ error: 'Invalid userCode' }, { status: 400 });
    }

    // Load quest
    const questLoader = getQuestLoader();
    const quest = questLoader.getQuestById(questId);

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    // Call Docker runner service
    console.log(`Executing code for quest: ${quest.title} (User: ${session.user.email})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const runnerResponse = await fetch(`${RUNNER_SERVICE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: userCode,
          tests: quest.tests
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!runnerResponse.ok) {
        const errorData = await runnerResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Runner service error:', errorData);
        
        return NextResponse.json({
          success: false,
          questId,
          error: errorData.error || 'Runner service error',
          stdout: '',
          stderr: errorData.error || 'Execution failed',
          testResults: [],
          runtimeMs: 0,
          allPassed: false
        }, { status: 500 });
      }

      const result = await runnerResponse.json();

      // Return structured results with questId added
      return NextResponse.json({
        success: result.success,
        questId,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        testResults: result.testResults || [],
        runtimeMs: result.executionTimeMs || 0,
        allPassed: result.allPassed || false,
        error: result.error
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Runner service timeout');
        return NextResponse.json({
          success: false,
          questId,
          error: 'Execution timeout',
          stdout: '',
          stderr: 'Runner service did not respond in time',
          testResults: [],
          runtimeMs: REQUEST_TIMEOUT,
          allPassed: false
        }, { status: 504 });
      }

      console.error('Error calling runner service:', fetchError);
      return NextResponse.json({
        success: false,
        questId,
        error: 'Failed to connect to runner service',
        stdout: '',
        stderr: fetchError.message || 'Service unavailable',
        testResults: [],
        runtimeMs: 0,
        allPassed: false
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Error in /api/run:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Code execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      runtimeMs: 0,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
      testResults: []
    }, { status: 500 });
  }
}

/**
 * GET method not supported
 */
export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed',
    message: 'Use POST with { questId, userCode }'
  }, { status: 405 });
}
