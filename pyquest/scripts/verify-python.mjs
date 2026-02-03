#!/usr/bin/env node
/**
 * PyQuest Python & Runner Verification Script
 * 
 * Checks system readiness for code execution in two modes:
 * 1. Local Dev Mode: Verifies Python installation on host
 * 2. Docker Mode: Verifies runner service health
 * 
 * Usage:
 *   npm run verify:python
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
config({ path: join(projectRoot, '.env') });

const RUNNER_URL = process.env.RUNNER_URL;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Check if a Python command is available
 */
async function checkPythonCommand(cmd) {
  return new Promise((resolve) => {
    const parts = cmd.split(' ');
    const proc = spawn(parts[0], [...parts.slice(1), '--version'], {
      shell: true,
      windowsHide: true,
    });

    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.stderr.on('data', (data) => output += data.toString());

    proc.on('close', (code) => {
      resolve({ available: code === 0, output: output.trim() });
    });

    proc.on('error', () => resolve({ available: false, output: '' }));

    // Timeout after 2 seconds
    setTimeout(() => {
      proc.kill();
      resolve({ available: false, output: 'Timeout' });
    }, 2000);
  });
}

/**
 * Check Python availability on host (for local dev mode)
 */
async function checkLocalPython() {
  log('\n📋 Local Development Mode Check', 'cyan');
  log('━'.repeat(50), 'cyan');

  const commands = ['py -3', 'python', 'python3'];
  let foundCommand = null;

  for (const cmd of commands) {
    process.stdout.write(`Trying '${cmd}'... `);
    const result = await checkPythonCommand(cmd);

    if (result.available) {
      log(`✅ Found: ${result.output}`, 'green');
      foundCommand = cmd;
      break;
    } else {
      log('❌ Not found', 'red');
    }
  }

  if (foundCommand) {
    log(`\n✅ Python is available: ${foundCommand}`, 'green');
    log('   Local execution mode will work.', 'green');
    return true;
  } else {
    log('\n❌ No Python found on host system', 'red');
    log('\n📝 To install Python:', 'yellow');
    log('   • Windows: https://www.python.org/downloads/', 'yellow');
    log('   • macOS: brew install python3', 'yellow');
    log('   • Linux: sudo apt install python3', 'yellow');
    log('\n   Or use Docker runner mode instead (see below)', 'yellow');
    return false;
  }
}

/**
 * Check Docker runner service health
 */
async function checkDockerRunner() {
  log('\n🐳 Docker Runner Mode Check', 'cyan');
  log('━'.repeat(50), 'cyan');

  if (!RUNNER_URL) {
    log('⚠️  RUNNER_URL not set in .env', 'yellow');
    log('   Set RUNNER_URL=http://localhost:8080 to use Docker runner', 'yellow');
    return false;
  }

  log(`Checking runner at: ${RUNNER_URL}/health`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${RUNNER_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      log(`✅ Runner service healthy: ${data.service} v${data.version}`, 'green');
      log(`   Python: ${data.python_version}`, 'green');
      log('   Docker runner mode will work.', 'green');
      return true;
    } else {
      log(`❌ Runner health check failed: HTTP ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      log('❌ Runner health check timeout (5s)', 'red');
    } else {
      log(`❌ Runner unavailable: ${error.message}`, 'red');
    }

    log('\n📝 To start the runner:', 'yellow');
    log('   npm run runner', 'yellow');
    log('   (or: docker-compose up -d runner)', 'yellow');
    return false;
  }
}

/**
 * Main verification
 */
async function main() {
  log('\n🔍 PyQuest Code Execution Verification\n', 'blue');

  const localOk = await checkLocalPython();
  const dockerOk = await checkDockerRunner();

  log('\n' + '━'.repeat(50), 'cyan');
  log('📊 Summary', 'cyan');
  log('━'.repeat(50), 'cyan');

  if (dockerOk) {
    log('✅ Docker runner mode: READY', 'green');
    log('   This is the recommended mode for all environments.', 'green');
  } else {
    log('❌ Docker runner mode: NOT AVAILABLE', 'red');
  }

  if (localOk) {
    log('✅ Local dev mode: READY', 'green');
    log('   ⚠️  Only use for local development (no sandboxing)', 'yellow');
  } else {
    log('❌ Local dev mode: NOT AVAILABLE', 'red');
  }

  log('');

  if (!dockerOk && !localOk) {
    log('❌ No execution mode available!', 'red');
    log('\n📝 Quick Fix:', 'yellow');
    log('   1. Start runner: npm run runner', 'yellow');
    log('   2. Verify: npm run verify:python', 'yellow');
    process.exit(1);
  } else if (!dockerOk) {
    log('⚠️  Running without Docker runner (dev-only mode)', 'yellow');
    log('   Start runner for production-ready execution:', 'yellow');
    log('   npm run runner', 'yellow');
  } else {
    log('✅ System ready for code execution!', 'green');
  }

  log('');
}

main().catch((error) => {
  log(`\n❌ Verification failed: ${error.message}`, 'red');
  process.exit(1);
});
