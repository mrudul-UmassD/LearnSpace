"""
PyQuest Runner Service - Docker Sandbox Executor

This service executes user-submitted Python code in a sandboxed environment.
It receives code and test specifications, runs the code safely, and returns
structured results including stdout, stderr, and test evaluation results.

Security Features:
- Runs in isolated Docker container
- No network access
- Read-only filesystem (except /tmp)
- CPU and memory limits
- 2-second execution timeout
- Output size limits (1MB)
"""

from flask import Flask, request, jsonify
import subprocess
import tempfile
import os
import json
import time
from typing import Dict, List, Any

app = Flask(__name__)

# Configuration
MAX_EXECUTION_TIME = 2  # seconds
MAX_OUTPUT_SIZE = 1024 * 1024  # 1MB
MAX_CODE_SIZE = 100 * 1024  # 100KB


def execute_python_code(code: str) -> Dict[str, str]:
    """
    Execute Python code in a temporary file with timeout and output limits.
    
    Args:
        code: Python source code to execute
        
    Returns:
        Dict with 'stdout' and 'stderr' keys
        
    Raises:
        TimeoutException: If execution exceeds MAX_EXECUTION_TIME
    """
    # Create temporary file for code
    # Use system temp directory (works on Windows and Linux)
    temp_dir = tempfile.gettempdir()
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, dir=temp_dir) as f:
        temp_file = f.name
        f.write(code)
    
    try:
        # Determine Python command (python3 on Linux, python on Windows)
        python_cmd = 'python3' if os.name != 'nt' else 'python'
        
        # Execute Python code with timeout
        # Note: subprocess.run timeout works cross-platform (Windows/Linux)
        process = subprocess.run(
            [python_cmd, temp_file],
            capture_output=True,
            text=True,
            timeout=MAX_EXECUTION_TIME,
            env={'PYTHONUNBUFFERED': '1'}  # Disable output buffering
        )
        
        # Limit output size
        stdout = process.stdout[:MAX_OUTPUT_SIZE] if process.stdout else ''
        stderr = process.stderr[:MAX_OUTPUT_SIZE] if process.stderr else ''
        
        # Add truncation warning if output was cut
        if len(process.stdout) > MAX_OUTPUT_SIZE:
            stdout += '\n[Output truncated - exceeded 1MB limit]'
        if len(process.stderr) > MAX_OUTPUT_SIZE:
            stderr += '\n[Error output truncated - exceeded 1MB limit]'
        
        return {
            'stdout': stdout.strip(),
            'stderr': stderr.strip()
        }
        
    except subprocess.TimeoutExpired:
        return {
            'stdout': '',
            'stderr': 'Error: Execution timeout (2 seconds exceeded)'
        }
    except Exception as e:
        return {
            'stdout': '',
            'stderr': f'Execution error: {str(e)}'
        }
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_file)
        except:
            pass


def evaluate_test(code: str, stdout: str, stderr: str, test: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluate a single test case against execution results.
    
    Args:
        code: Original Python code
        stdout: Standard output from execution
        stderr: Standard error from execution
        test: Test specification dict
        
    Returns:
        Dict with test result including 'passed', 'description', 'expected', 'actual'
    """
    # If there's a Python error, all tests fail
    if stderr and not stdout:
        return {
            'description': test.get('description', 'Test'),
            'passed': False,
            'error': stderr,
            'actual': 'Execution error'
        }
    
    test_type = test.get('type')
    
    if test_type == 'output':
        # Check if output matches expected
        expected = str(test.get('expected', '')).strip()
        actual = stdout.strip()
        passed = actual == expected
        return {
            'description': test.get('description'),
            'passed': passed,
            'expected': expected,
            'actual': actual
        }
    
    elif test_type == 'variable_exists':
        # Check if variable is defined in code
        variable = test.get('variable')
        import re
        pattern = rf'\b{re.escape(variable)}\s*='
        exists = bool(re.search(pattern, code))
        return {
            'description': test.get('description'),
            'passed': exists,
            'expected': f"Variable '{variable}' should exist",
            'actual': 'Found' if exists else 'Not found'
        }
    
    elif test_type == 'variable_type':
        # Infer variable type from code
        variable = test.get('variable')
        expected_type = test.get('expectedType')
        
        import re
        match = re.search(rf'{re.escape(variable)}\s*=\s*(.+?)(?:\n|$)', code)
        if not match:
            return {
                'description': test.get('description'),
                'passed': False,
                'expected': expected_type,
                'actual': 'Variable not found'
            }
        
        value = match.group(1).strip()
        
        # Detect type
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            actual_type = 'str'
        elif re.match(r'^\d+$', value):
            actual_type = 'int'
        elif re.match(r'^\d+\.\d+$', value):
            actual_type = 'float'
        elif value.startswith('[') and value.endswith(']'):
            actual_type = 'list'
        elif value.startswith('{') and value.endswith('}'):
            actual_type = 'dict'
        else:
            actual_type = 'unknown'
        
        return {
            'description': test.get('description'),
            'passed': actual_type == expected_type,
            'expected': expected_type,
            'actual': actual_type
        }
    
    elif test_type == 'variable_value':
        # Check variable value
        variable = test.get('variable')
        expected = test.get('expected')
        
        import re
        match = re.search(rf'{re.escape(variable)}\s*=\s*(.+?)(?:\n|$)', code)
        if not match:
            return {
                'description': test.get('description'),
                'passed': False,
                'expected': expected,
                'actual': 'Variable not found'
            }
        
        actual = match.group(1).strip()
        expected_str = str(expected)
        
        # Try multiple comparison formats
        matches = (
            actual == expected_str or
            actual == f'"{expected_str}"' or
            actual == f"'{expected_str}'"
        )
        
        return {
            'description': test.get('description'),
            'passed': matches,
            'expected': expected,
            'actual': actual
        }
    
    elif test_type == 'function_call':
        # Check if expected output appears in stdout
        expected = str(test.get('expected', '')).strip()
        output_lines = stdout.split('\n')
        passed = any(line.strip() == expected for line in output_lines)
        
        return {
            'description': test.get('description'),
            'passed': passed,
            'expected': expected,
            'actual': stdout
        }
    
    elif test_type == 'list_contains':
        # Check if list contains item
        variable = test.get('variable')
        expected = test.get('expected')
        
        import re
        match = re.search(rf'{re.escape(variable)}\s*=\s*\[(.+?)\]', code)
        if not match:
            return {
                'description': test.get('description'),
                'passed': False,
                'expected': expected,
                'actual': 'List not found'
            }
        
        list_content = match.group(1)
        contains = (
            json.dumps(expected) in list_content or
            f"'{expected}'" in list_content or
            f'"{expected}"' in list_content
        )
        
        return {
            'description': test.get('description'),
            'passed': contains,
            'expected': f'List should contain {expected}',
            'actual': list_content
        }
    
    elif test_type == 'list_length':
        # Check list length
        variable = test.get('variable')
        expected_length = test.get('expected')
        
        import re
        match = re.search(rf'{re.escape(variable)}\s*=\s*\[(.+?)\]', code)
        if not match:
            return {
                'description': test.get('description'),
                'passed': False,
                'expected': expected_length,
                'actual': 'List not found'
            }
        
        list_content = match.group(1)
        items = [item.strip() for item in list_content.split(',') if item.strip()]
        actual_length = len(items)
        
        return {
            'description': test.get('description'),
            'passed': actual_length == expected_length,
            'expected': expected_length,
            'actual': actual_length
        }
    
    else:
        return {
            'description': test.get('description'),
            'passed': False,
            'error': f'Unknown test type: {test_type}'
        }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for container orchestration"""
    return jsonify({
        'status': 'healthy',
        'service': 'pyquest-runner',
        'version': '1.0.0'
    })


@app.route('/run', methods=['POST'])
def run_code():
    """
    Execute Python code with tests.
    
    Request JSON:
        {
            "code": "print('Hello')",
            "tests": [
                {
                    "type": "output",
                    "expected": "Hello",
                    "description": "Should print Hello"
                }
            ]
        }
    
    Response JSON:
        {
            "success": true,
            "stdout": "Hello",
            "stderr": "",
            "testResults": [...],
            "executionTimeMs": 123,
            "allPassed": true
        }
    """
    try:
        # Parse request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid JSON'
            }), 400
        
        code = data.get('code', '')
        tests = data.get('tests', [])
        
        # Validate input
        if not code:
            return jsonify({
                'success': False,
                'error': 'No code provided'
            }), 400
        
        if len(code) > MAX_CODE_SIZE:
            return jsonify({
                'success': False,
                'error': f'Code exceeds maximum size ({MAX_CODE_SIZE} bytes)'
            }), 400
        
        # Execute code
        start_time = time.time()
        execution_result = execute_python_code(code)
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        stdout = execution_result['stdout']
        stderr = execution_result['stderr']
        
        # Evaluate tests
        test_results = []
        for test in tests:
            result = evaluate_test(code, stdout, stderr, test)
            test_results.append(result)
        
        all_passed = all(result.get('passed', False) for result in test_results)
        
        return jsonify({
            'success': True,
            'stdout': stdout,
            'stderr': stderr,
            'testResults': test_results,
            'executionTimeMs': execution_time_ms,
            'allPassed': all_passed
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # Run Flask app
    app.run(host='0.0.0.0', port=8080, debug=False)
