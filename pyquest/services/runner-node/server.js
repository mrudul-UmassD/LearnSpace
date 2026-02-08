const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8081;

// Constants
const MAX_EXECUTION_TIME = 2000; // 2 seconds
const MAX_OUTPUT_SIZE = 64 * 1024; // 64KB
const TEMP_DIR = '/tmp';

app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'node-runner', 
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: ['fs', 'path', 'json', 'async']
  });
});

// Code execution endpoint
app.post('/run', async (req, res) => {
  const startTime = Date.now();
  const { code, tests, dataset } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid code parameter',
      executionTimeMs: Date.now() - startTime
    });
  }

  let stdout = '';
  let stderr = '';
  let success = false;
  let error = null;
  const testResults = [];

  try {
    // Setup dataset files if provided
    const datasetFiles = [];
    if (dataset && dataset.files && Array.isArray(dataset.files)) {
      for (const file of dataset.files) {
        const filePath = path.join(TEMP_DIR, file.name);
        try {
          fs.writeFileSync(filePath, file.content, 'utf8');
          datasetFiles.push(filePath);
        } catch (err) {
          console.error(`Failed to create dataset file ${file.name}:`, err);
        }
      }
    }

    // Custom console for capturing output
    const consoleLog = [];
    const mockConsole = {
      log: (...args) => {
        const message = args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');
        consoleLog.push(message);
      },
      error: (...args) => {
        const message = args.map(arg => String(arg)).join(' ');
        stderr += message + '\n';
      },
      warn: (...args) => {
        consoleLog.push('[WARN] ' + args.map(arg => String(arg)).join(' '));
      }
    };

    // Create safe sandbox with Node.js modules
    const sandbox = {
      console: mockConsole,
      // Node built-in modules (safe subset)
      fs: {
        readFileSync: (filepath, encoding) => {
          // Only allow reading /tmp
          if (!filepath.startsWith(TEMP_DIR)) {
            throw new Error('Read access denied: only /tmp is accessible');
          }
          return fs.readFileSync(filepath, encoding || 'utf8');
        },
        writeFileSync: (filepath, data, encoding) => {
          // Only allow writes to /tmp
          if (!filepath.startsWith(TEMP_DIR)) {
            throw new Error('Write access denied: only /tmp is writable');
          }
          return fs.writeFileSync(filepath, data, encoding || 'utf8');
        },
        existsSync: (filepath) => {
          if (!filepath.startsWith(TEMP_DIR)) {
            return false;
          }
          return fs.existsSync(filepath);
        },
        readdirSync: (dir) => {
          // Only allow reading /tmp
          if (!dir.startsWith(TEMP_DIR)) {
            throw new Error('Read access denied to this directory');
          }
          return fs.readdirSync(dir);
        }
      },
      path: {
        join: path.join,
        basename: path.basename,
        dirname: path.dirname,
        extname: path.extname,
        parse: path.parse,
        sep: path.sep
      },
      JSON: JSON,
      // Disable dangerous globals
      process: undefined,
      require: undefined,
      __dirname: TEMP_DIR,
      __filename: path.join(TEMP_DIR, 'code.js'),
      // Allow Promise and async/await
      Promise: Promise
    };

    // Set timeout for execution
    let executionTimeout;
    let timedOut = false;

    try {
      // Create async-safe execution function
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const executionFunction = new AsyncFunction(
        'console', 'fs', 'path', 'JSON', '__dirname', '__filename', 'Promise',
        code
      );
      
      // Execute with timeout
      await Promise.race([
        executionFunction(
          mockConsole,
          sandbox.fs,
          sandbox.path,
          sandbox.JSON,
          sandbox.__dirname,
          sandbox.__filename,
          sandbox.Promise
        ),
        new Promise((_, reject) => {
          executionTimeout = setTimeout(() => {
            timedOut = true;
            reject(new Error('Execution timeout exceeded'));
          }, MAX_EXECUTION_TIME);
        })
      ]);
      
      if (executionTimeout) clearTimeout(executionTimeout);
      stdout = consoleLog.join('\n');
      success = true;
    } catch (execError) {
      if (executionTimeout) clearTimeout(executionTimeout);
      if (timedOut) {
        error = `Execution timeout: Code took longer than ${MAX_EXECUTION_TIME}ms`;
        stderr += error + '\n';
      } else {
        error = execError.message;
        stderr += (execError.stack || execError.message) + '\n';
      }
      success = false;
    }

    // Cleanup dataset files
    for (const filePath of datasetFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Failed to cleanup file ${filePath}:`, err);
      }
    }

    // Run tests if provided
    if (tests && Array.isArray(tests)) {
      for (const test of tests) {
        let passed = false;
        let actual = '';
        let message = '';

        try {
          if (test.type === 'output') {
            // Check if output matches expected
            actual = stdout.trim();
            const expected = String(test.expected || '').trim();
            passed = actual === expected;
            message = passed ? 'Output matches expected' : `Expected: ${expected}, Got: ${actual}`;
          } else {
            message = `Test type '${test.type}' not supported`;
          }
        } catch (testError) {
          message = testError.message;
          passed = false;
        }

        testResults.push({
          id: test.id || 'unknown',
          passed,
          message,
          actual,
          expected: test.expected
        });
      }
    }

    const allPassed = testResults.length > 0 ? testResults.every(t => t.passed) : success;

    // Truncate output if too large
    const truncatedStdout = stdout.length > MAX_OUTPUT_SIZE;
    const truncatedStderr = stderr.length > MAX_OUTPUT_SIZE;
    
    if (truncatedStdout) {
      stdout = stdout.substring(0, MAX_OUTPUT_SIZE) + '\n[Output truncated]';
    }
    if (truncatedStderr) {
      stderr = stderr.substring(0, MAX_OUTPUT_SIZE) + '\n[Error output truncated]';
    }

    res.json({
      success,
      allPassed,
      stdout,
      stderr,
      error,
      testResults,
      executionTimeMs: Date.now() - startTime,
      truncatedStdout,
      truncatedStderr
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      allPassed: false,
      stdout: '',
      stderr: err.message || 'Internal server error',
      error: err.message,
      testResults: [],
      executionTimeMs: Date.now() - startTime
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node runner service listening on port ${PORT}`);
  console.log('Ready to execute JavaScript/Node.js code');
  console.log('Features: fs, path, JSON, async/await, Promise');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
