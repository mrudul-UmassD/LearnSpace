import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Metrics endpoint for monitoring and observability
 * Returns application metrics in a structured format
 */
export async function GET() {
  try {
    const startTime = Date.now();

    // Check database connectivity
    let dbStatus = 'unknown';
    let dbLatencyMs = 0;
    let userCount = 0;
    let questAttemptCount = 0;

    try {
      const dbStartTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStartTime;
      dbStatus = 'healthy';

      // Get basic counts (cached for performance)
      [userCount, questAttemptCount] = await Promise.all([
        prisma.user.count(),
        prisma.questAttempt.count(),
      ]);
    } catch (error) {
      dbStatus = 'unhealthy';
      console.error('Database health check failed:', error);
    }

    // Check runner service connectivity
    let runnerStatus = 'unknown';
    let runnerLatencyMs = 0;
    const runnerUrl = process.env.RUNNER_SERVICE_URL;

    if (runnerUrl) {
      try {
        const runnerStartTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${runnerUrl}/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        runnerLatencyMs = Date.now() - runnerStartTime;
        runnerStatus = response.ok ? 'healthy' : 'unhealthy';
      } catch (error) {
        runnerStatus = 'unhealthy';
        console.error('Runner health check failed:', error);
      }
    } else {
      runnerStatus = 'not_configured';
    }

    const totalLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'ok',
      service: 'pyquest-web',
      version: process.env.npm_package_version || '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      latency: {
        total_ms: totalLatencyMs,
        database_ms: dbLatencyMs,
        runner_ms: runnerLatencyMs,
      },
      dependencies: {
        database: {
          status: dbStatus,
          latency_ms: dbLatencyMs,
        },
        runner: {
          status: runnerStatus,
          latency_ms: runnerLatencyMs,
          url: runnerUrl ? 'configured' : 'not_configured',
        },
      },
      metrics: {
        users_total: userCount,
        quest_attempts_total: questAttemptCount,
      },
      environment: {
        node_env: process.env.NODE_ENV,
        platform: process.platform,
        node_version: process.version,
      },
    });
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
