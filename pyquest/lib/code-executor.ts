import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { QuestTest } from '@/types/quest';

const execAsync = promisify(exec);

export interface TestResult {
  description: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

export interface ExecutionResult {
  allPassed: boolean;
  stdout: string;
  stderr: string;
  testResults: TestResult[];
  executionTime: number;
  error?: string;
}

/**
 * ⚠️ DEV ONLY - LOCAL PYTHON EXECUTION ⚠️
 * 
 * This implementation uses Node.js child_process to execute Python code locally.
 * It is NOT suitable for production due to security concerns.
 * 
 * TODO: Replace with Docker sandbox or remote API (Judge0, Piston) before production
 * 
 * Security Issues:
 * - No resource limits (CPU, memory)
 * - Can access file system
 * - Can make network requests
 * - Can import any module
 * - Can execute arbitrary commands
 * 
 * For production, use:
 * 1. Docker container with resource limits
 * 2. Remote execution API (Judge0: https://ce.judge0.com/)
 * 3. AWS Lambda with sandboxing
 */
export async function executeUserCode(code: string, tests: QuestTest[]): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  try {
    console.warn('⚠️  DEV ONLY: Executing Python code locally without sandbox');
    
    // Execute Python code and capture output
    const { stdout, stderr } = await executePython(code);
    
    // Run tests against the output
    const testResults: TestResult[] = tests.map(test => {
      return evaluateTest(code, stdout, stderr, test);
    });

    const allPassed = testResults.every(result => result.passed);
    const executionTime = Date.now() - startTime;

    return {
      allPassed,
      stdout,
      stderr,
      testResults,
      executionTime
    };
  } catch (error) {
    return {
      allPassed: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
      testResults: tests.map(test => ({
        description: test.description,
        passed: false,
        error: 'Execution failed'
      })),
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Execute Python code using subprocess
 * DEV ONLY - No sandboxing!
 */
async function executePython(code: string): Promise<{ stdout: string; stderr: string }> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `pyquest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
  
  try {
    // Write code to temporary file
    await fs.writeFile(tempFile, code, 'utf-8');
    
    // Execute with timeout
    const { stdout, stderr } = await execAsync(`python "${tempFile}"`, {
      timeout: 5000, // 5 second timeout
      maxBuffer: 1024 * 1024, // 1MB max output
      windowsHide: true
    });
    
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    // Handle execution errors
    if (error.killed) {
      throw new Error('Execution timeout (5 seconds)');
    }
    
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message
    };
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Evaluate a single test against the execution results
 */
function evaluateTest(code: string, stdout: string, stderr: string, test: QuestTest): TestResult {
  // If there's a Python error, all tests fail
  if (stderr && !stdout) {
    return {
      description: test.description,
      passed: false,
      error: stderr,
      actual: 'Execution error'
    };
  }

  switch (test.type) {
    case 'output':
      const outputPassed = stdout.trim() === test.expected?.toString().trim();
      return {
        description: test.description,
        passed: outputPassed,
        expected: test.expected,
        actual: stdout.trim()
      };

    case 'variable_exists':
      // Check if variable is defined in the code
      const varExists = new RegExp(`\\b${test.variable}\\s*=`).test(code);
      return {
        description: test.description,
        passed: varExists,
        expected: `Variable '${test.variable}' should exist`,
        actual: varExists ? 'Found' : 'Not found'
      };

    case 'variable_type':
      // We need to inspect the variable - add a check to the code
      // This is done by checking the code structure (simplified)
      const varTypeMatch = code.match(new RegExp(`${test.variable}\\s*=\\s*(.+?)(?:\\n|$)`));
      if (!varTypeMatch) {
        return {
          description: test.description,
          passed: false,
          expected: test.expectedType,
          actual: 'Variable not found'
        };
      }
      
      const value = varTypeMatch[1].trim();
      let actualType = 'unknown';
      
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        actualType = 'str';
      } else if (/^\d+$/.test(value)) {
        actualType = 'int';
      } else if (/^\d+\.\d+$/.test(value)) {
        actualType = 'float';
      } else if (value.startsWith('[') && value.endsWith(']')) {
        actualType = 'list';
      }
      
      return {
        description: test.description,
        passed: actualType === test.expectedType,
        expected: test.expectedType,
        actual: actualType
      };

    case 'variable_value':
      const valueMatch = code.match(new RegExp(`${test.variable}\\s*=\\s*(.+?)(?:\\n|$)`));
      if (!valueMatch) {
        return {
          description: test.description,
          passed: false,
          expected: test.expected,
          actual: 'Variable not found'
        };
      }
      
      const actualValue = valueMatch[1].trim();
      const expectedStr = test.expected?.toString();
      const valueMatches = actualValue === expectedStr || actualValue === `"${expectedStr}"` || actualValue === `'${expectedStr}'`;
      
      return {
        description: test.description,
        passed: valueMatches,
        expected: test.expected,
        actual: actualValue
      };

    case 'function_call':
      // For function calls, we expect the output to match
      // The code should already have the function call that prints the result
      const outputLines = stdout.split('\n');
      const expectedOutput = test.expected?.toString();
      const functionPassed = outputLines.some(line => line.trim() === expectedOutput?.trim());
      
      return {
        description: test.description,
        passed: functionPassed,
        expected: test.expected,
        actual: stdout
      };

    case 'list_contains':
      // Check if list contains the expected item
      const listContainsMatch = code.match(new RegExp(`${test.variable}\\s*=\\s*\\[(.+?)\\]`));
      if (!listContainsMatch) {
        return {
          description: test.description,
          passed: false,
          expected: test.expected,
          actual: 'List not found'
        };
      }
      
      const listContent = listContainsMatch[1];
      const containsItem = listContent.includes(JSON.stringify(test.expected)) || listContent.includes(`'${test.expected}'`);
      
      return {
        description: test.description,
        passed: containsItem,
        expected: `List should contain ${test.expected}`,
        actual: listContent
      };

    case 'list_length':
      // Check list length
      const listLengthMatch = code.match(new RegExp(`${test.variable}\\s*=\\s*\\[(.+?)\\]`));
      if (!listLengthMatch) {
        return {
          description: test.description,
          passed: false,
          expected: test.expected,
          actual: 'List not found'
        };
      }
      
      // Count items in list (simple comma-based count)
      const items = listLengthMatch[1].split(',').filter(item => item.trim());
      const lengthMatches = items.length === test.expected;
      
      return {
        description: test.description,
        passed: lengthMatches,
        expected: test.expected,
        actual: items.length
      };

    default:
      return {
        description: test.description,
        passed: false,
        error: `Unknown test type: ${test.type}`
      };
  }
}
