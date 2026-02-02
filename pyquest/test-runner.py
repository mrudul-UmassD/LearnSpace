#!/usr/bin/env python3
"""
Test script for PyQuest Runner Service
Tests safeguards: timeouts, output limits, infinite loops
"""

import requests
import json
import time

RUNNER_URL = "http://localhost:8080"

def test_runner(name: str, code: str, tests: list, expected_pass: bool = True):
    """Run a test against the runner service"""
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")
    print(f"Code:\n{code}\n")
    
    try:
        start = time.time()
        response = requests.post(
            f"{RUNNER_URL}/run",
            json={"code": code, "tests": tests},
            timeout=15
        )
        elapsed = time.time() - start
        
        print(f"Status: {response.status_code}")
        print(f"Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Success: {result.get('success')}")
            print(f"All Passed: {result.get('allPassed')}")
            print(f"Execution Time: {result.get('executionTimeMs')}ms")
            print(f"Stdout: {result.get('stdout')[:100]}")
            print(f"Stderr: {result.get('stderr')[:100]}")
            
            if result.get('allPassed') == expected_pass:
                print("✅ PASS")
                return True
            else:
                print(f"❌ FAIL - Expected allPassed={expected_pass}")
                return False
        else:
            print(f"❌ FAIL - Status {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ FAIL - Exception: {e}")
        return False


def main():
    print("PyQuest Runner Service - Safeguard Tests")
    print("="*60)
    
    # Test 1: Simple Hello World (should pass)
    test1 = test_runner(
        "Simple Hello World",
        'print("Hello, World!")',
        [{
            "type": "output",
            "expected": "Hello, World!",
            "description": "Should print Hello, World!"
        }],
        expected_pass=True
    )
    
    # Test 2: Infinite Loop (should timeout)
    test2 = test_runner(
        "Infinite Loop (Timeout)",
        'while True:\n    pass',
        [{
            "type": "output",
            "expected": "",
            "description": "Should timeout"
        }],
        expected_pass=False
    )
    
    # Test 3: Huge Output (should truncate)
    test3 = test_runner(
        "Huge Output (Truncation)",
        'for i in range(100000):\n    print("A" * 1000)',
        [{
            "type": "output",
            "expected": "test",
            "description": "Should truncate output"
        }],
        expected_pass=False
    )
    
    # Test 4: Sleep (should timeout)
    test4 = test_runner(
        "Sleep (Timeout)",
        'import time\ntime.sleep(10)\nprint("Done")',
        [{
            "type": "output",
            "expected": "Done",
            "description": "Should timeout before print"
        }],
        expected_pass=False
    )
    
    # Test 5: Variables (should pass)
    test5 = test_runner(
        "Variable Tests",
        'name = "Alice"\nage = 25\nprint(f"{name} is {age}")',
        [
            {
                "type": "variable_exists",
                "variable": "name",
                "description": "Should have name variable"
            },
            {
                "type": "variable_type",
                "variable": "name",
                "expectedType": "str",
                "description": "name should be string"
            },
            {
                "type": "variable_value",
                "variable": "age",
                "expected": 25,
                "description": "age should be 25"
            }
        ],
        expected_pass=True
    )
    
    # Test 6: Lists (should pass)
    test6 = test_runner(
        "List Tests",
        'fruits = ["apple", "banana", "cherry"]',
        [
            {
                "type": "list_contains",
                "variable": "fruits",
                "expected": "banana",
                "description": "Should contain banana"
            },
            {
                "type": "list_length",
                "variable": "fruits",
                "expected": 3,
                "description": "Should have 3 items"
            }
        ],
        expected_pass=True
    )
    
    # Test 7: Syntax Error (should fail)
    test7 = test_runner(
        "Syntax Error",
        'print("missing parenthesis"',
        [{
            "type": "output",
            "expected": "test",
            "description": "Should error"
        }],
        expected_pass=False
    )
    
    # Test 8: Runtime Error (should fail)
    test8 = test_runner(
        "Runtime Error",
        'x = 10 / 0',
        [{
            "type": "variable_exists",
            "variable": "x",
            "description": "Should error"
        }],
        expected_pass=False
    )
    
    # Summary
    tests = [test1, test2, test3, test4, test5, test6, test7, test8]
    passed = sum(tests)
    total = len(tests)
    
    print("\n" + "="*60)
    print(f"RESULTS: {passed}/{total} tests passed")
    print("="*60)
    
    if passed == total:
        print("✅ All safeguard tests PASSED")
        return 0
    else:
        print(f"❌ {total - passed} tests FAILED")
        return 1


if __name__ == "__main__":
    exit(main())
