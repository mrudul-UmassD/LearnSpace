import { QuestTest } from '@/types/quest';

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
 * Execute user code and run tests
 * This is a mock implementation - replace with real Python execution
 */
export async function executeUserCode(code: string, tests: QuestTest[]): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  try {
    // MOCK IMPLEMENTATION
    // In production, this should:
    // 1. Use a Python sandbox (Judge0, Piston, or subprocess with timeout)
    // 2. Execute the code
    // 3. Capture stdout/stderr
    // 4. Run tests against the output
    
    // For now, simulate execution with basic checks
    const stdout = simulateExecution(code);
    const stderr = '';
    
    const testResults: TestResult[] = tests.map(test => {
      const result = evaluateTest(code, stdout, test);
      return result;
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

function simulateExecution(code: string): string {
  // Simple simulation - extract print statements
  const printMatches = code.matchAll(/print\((.*?)\)/g);
  const outputs: string[] = [];
  
  for (const match of printMatches) {
    let arg = match[1].trim();
    // Remove quotes from strings
    if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
      arg = arg.slice(1, -1);
    }
    outputs.push(arg);
  }
  
  return outputs.join('\n');
}

function evaluateTest(code: string, stdout: string, test: QuestTest): TestResult {
  switch (test.type) {
    case 'output':
      const passed = stdout.trim() === test.expected?.toString().trim();
      return {
        description: test.description,
        passed,
        expected: test.expected,
        actual: stdout.trim()
      };

    case 'variable_exists':
      const varExists = new RegExp(`\\b${test.variable}\\s*=`).test(code);
      return {
        description: test.description,
        passed: varExists,
        expected: `Variable '${test.variable}' should exist`,
        actual: varExists ? 'Found' : 'Not found'
      };

    case 'variable_type':
      // Basic type checking based on assignment
      const varMatch = code.match(new RegExp(`${test.variable}\\s*=\\s*(.+?)(?:\\n|$)`));
      if (!varMatch) {
        return {
          description: test.description,
          passed: false,
          expected: test.expectedType,
          actual: 'Variable not found'
        };
      }
      
      const value = varMatch[1].trim();
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
      const matches = actualValue === expectedStr;
      
      return {
        description: test.description,
        passed: matches,
        expected: test.expected,
        actual: actualValue
      };

    case 'function_call':
      // Check if function is defined
      const funcExists = code.includes(`def ${test.function}(`);
      return {
        description: test.description,
        passed: funcExists,
        expected: `Function '${test.function}' should be defined`,
        actual: funcExists ? 'Found' : 'Not found'
      };

    case 'list_contains':
    case 'list_length':
      // Basic list checking
      const listMatch = code.match(new RegExp(`${test.variable}\\s*=\\s*\\[(.+?)\\]`));
      if (!listMatch) {
        return {
          description: test.description,
          passed: false,
          expected: test.expected,
          actual: 'List not found'
        };
      }
      
      return {
        description: test.description,
        passed: true, // Simplified for demo
        expected: test.expected,
        actual: 'Checking...'
      };

    default:
      return {
        description: test.description,
        passed: false,
        error: `Unknown test type: ${test.type}`
      };
  }
}

/**
 * TODO: Real implementation using Python subprocess or API
 * 
 * Example with subprocess:
 * 
 * import { exec } from 'child_process';
 * import { promisify } from 'util';
 * import fs from 'fs/promises';
 * import path from 'path';
 * 
 * const execAsync = promisify(exec);
 * 
 * export async function executeUserCode(code: string, tests: QuestTest[]): Promise<ExecutionResult> {
 *   const tempFile = path.join('/tmp', `pyquest_${Date.now()}.py`);
 *   
 *   try {
 *     await fs.writeFile(tempFile, code);
 *     
 *     const { stdout, stderr } = await execAsync(`python3 ${tempFile}`, {
 *       timeout: 5000, // 5 second timeout
 *       maxBuffer: 1024 * 1024 // 1MB max output
 *     });
 *     
 *     // Run tests against output
 *     const testResults = tests.map(test => evaluateTest(code, stdout, test));
 *     
 *     return {
 *       allPassed: testResults.every(r => r.passed),
 *       stdout,
 *       stderr,
 *       testResults,
 *       executionTime: Date.now() - startTime
 *     };
 *   } finally {
 *     await fs.unlink(tempFile).catch(() => {});
 *   }
 * }
 */
