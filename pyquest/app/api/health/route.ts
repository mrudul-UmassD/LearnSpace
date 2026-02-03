import { NextResponse } from 'next/server';

/**
 * Health check endpoint for container orchestration
 */
export async function GET() {
  try {
    // Check if we can access environment variables
    const hasDatabase = !!process.env.DATABASE_URL;
    const hasRunnerUrl = !!process.env.RUNNER_URL;
    
    return NextResponse.json({
      status: 'healthy',
      service: 'pyquest-web',
      timestamp: new Date().toISOString(),
      config: {
        database: hasDatabase ? 'configured' : 'missing',
        runner: hasRunnerUrl ? 'configured' : 'missing'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
