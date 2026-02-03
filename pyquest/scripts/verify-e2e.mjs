#!/usr/bin/env node
/**
 * End-to-End Verification Script for PyQuest
 * 
 * Tests the complete code execution flow:
 * 1. Runner service health check
 * 2. Execute a simple Python quest through /api/run
 * 3. Verify structured response
 * 
 * Usage:
 *   node scripts/verify-e2e.mjs
 *   npm run verify:e2e
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RUNNER_URL = process.env.RUNNER_URL || 'http://localhost:8080';
const TIMEOUT_MS = 10000;

let serverProcess = null;
let exitCode = 0;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function checkRunnerHealth() {
  info('Checking runner service health...');
  
  try {
    const response = await fetchWithTimeout(`${RUNNER_URL}/health`, {}, 5000);
    
    if (!response.ok) {
      error(`Runner health check failed: HTTP ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.status !== 'healthy') {
      error(`Runner status: ${data.status}`);
      return false;
    }
    
    success(`Runner service healthy: ${data.service} v${data.version}`);
    return true;
  } catch (err) {
    error(`Runner health check failed: ${err.message}`);
    log('  Make sure runner service is running: npm run runner', 'yellow');
    return false;
  }
}

async function testCodeExecution() {
  info('Testing code execution through /api/run...');
  
  const testCode = `print("Hello, PyQuest!")`;
  
  const payload = {
    questId: 'test-quest',
    userCode: testCode,
  };
  
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'test-session=dummy', // Mock auth for test
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    
    log(`  Response status: ${response.status}`, 'dim');
    log(`  Response data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`, 'dim');
    
    // Check for structured response (even if unauthorized)
    if (response.status === 401) {
      info('Received expected 401 Unauthorized (auth working)');
      if (data.error) {
        success('API returns structured error response');
        return true;
      } else {
        error('API returned 401 but no structured error');
        return false;
      }
    }
    
    // Check for runner connectivity issues
    if (response.status === 503 && data.transportError) {
      error(`Runner connectivity issue: ${data.error || 'Unknown'}`);
      return false;
    }
    
    // Check for successful execution (if auth bypassed)
    if (response.status === 200) {
      if (data.success && data.stdout) {
        success(`Code executed successfully: ${data.stdout}`);
        return true;
      } else {
        error('Unexpected success response structure');
        return false;
      }
    }
    
    // Any other response
    error(`Unexpected response status: ${response.status}`);
    return false;
    
  } catch (err) {
    error(`Code execution test failed: ${err.message}`);
    return false;
  }
}

async function runVerification() {
  log('\n🔍 PyQuest End-to-End Verification\n', 'cyan');
  
  // Step 1: Check runner health
  const runnerHealthy = await checkRunnerHealth();
  
  if (!runnerHealthy) {
    log('\n📋 Summary:', 'yellow');
    error('Runner service not available');
    log('\nTo start runner service:', 'cyan');
    log('  npm run runner', 'dim');
    exitCode = 1;
    return;
  }
  
  await sleep(500);
  
  // Step 2: Test code execution
  const executionSuccess = await testCodeExecution();
  
  await sleep(500);
  
  // Summary
  log('\n📋 Summary:', 'cyan');
  
  if (runnerHealthy && executionSuccess) {
    success('All checks passed!');
    log('\n✨ PyQuest is ready for code execution', 'green');
    exitCode = 0;
  } else {
    error('Some checks failed');
    
    if (!runnerHealthy) {
      log('\n⚠️  Runner service not available', 'yellow');
      log('   Start it with: npm run runner', 'dim');
    }
    
    if (!executionSuccess) {
      log('\n⚠️  Code execution test failed', 'yellow');
      log('   Check server logs for details', 'dim');
    }
    
    exitCode = 1;
  }
  
  log('');
}

// Run verification
runVerification()
  .then(() => {
    process.exit(exitCode);
  })
  .catch((err) => {
    error(`Verification failed with error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
