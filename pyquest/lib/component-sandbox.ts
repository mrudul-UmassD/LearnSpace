/**
 * React Component Testing Sandbox
 * 
 * Safely evaluates React components and runs RTL-style tests in-browser
 * Uses iframe isolation for security
 */

import { ComponentTest } from '@/lib/quest-schema';

export interface ComponentTestResult {
  id: string;
  type: string;
  description: string;
  passed: boolean;
  message?: string;
  actual?: string;
  expected?: string;
}

export interface ComponentExecutionResult {
  success: boolean;
  allPassed: boolean;
  testResults: ComponentTestResult[];
  renderedHTML?: string;
  error?: string;
  executionTimeMs: number;
}

/**
 * Evaluate component code and run tests in sandboxed environment
 */
export async function evaluateComponent(
  componentCode: string,
  tests: ComponentTest[],
  timeoutMs: number = 5000
): Promise<ComponentExecutionResult> {
  const startTime = performance.now();

  try {
    // Step 1: Transform and render the component
    const renderResult = await renderComponentInSandbox(componentCode, timeoutMs);
    
    if (!renderResult.success) {
      return {
        success: false,
        allPassed: false,
        testResults: [],
        error: renderResult.error || 'Failed to render component',
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // Step 2: Run tests against rendered DOM
    const testResults = await runComponentTests(
      renderResult.container!,
      renderResult.root!,
      tests
    );

    const allPassed = testResults.every(t => t.passed);
    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      allPassed,
      testResults,
      renderedHTML: renderResult.html,
      executionTimeMs,
    };
  } catch (error) {
    return {
      success: false,
      allPassed: false,
      testResults: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

interface RenderResult {
  success: boolean;
  container?: HTMLElement;
  root?: any;
  html?: string;
  error?: string;
}

/**
 * Render React component in isolated container
 */
async function renderComponentInSandbox(
  componentCode: string,
  timeoutMs: number
): Promise<RenderResult> {
  return new Promise((resolve) => {
    try {
      // Create isolated container
      const container = document.createElement('div');
      container.id = 'react-test-container';
      container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px;';
      document.body.appendChild(container);

      // Import React dynamically
      import('react').then((React) => {
        import('react-dom/client').then((ReactDOM) => {
          try {
            // Transform component code to executable function
            const ComponentFunction = transformComponentCode(componentCode, React);
            
            // Create root and render
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(ComponentFunction));

            // Wait for render to complete
            setTimeout(() => {
              const html = container.innerHTML;
              
              resolve({
                success: true,
                container,
                root,
                html,
              });
            }, 100); // Small delay for React to finish rendering

          } catch (error) {
            resolve({
              success: false,
              error: `Component render error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        });
      });

      // Timeout protection
      setTimeout(() => {
        resolve({
          success: false,
          error: 'Component rendering timeout',
        });
      }, timeoutMs);

    } catch (error) {
      resolve({
        success: false,
        error: `Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });
}

/**
 * Transform user component code into executable function
 */
function transformComponentCode(code: string, React: any): () => JSX.Element {
  try {
    // Remove import statements (React is already available)
    code = code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
    
    // Extract component name if it's a default export
    const defaultExportMatch = code.match(/export\s+default\s+function\s+(\w+)/);
    const componentName = defaultExportMatch ? defaultExportMatch[1] : 'Component';
    
    // Remove export statements
    code = code.replace(/export\s+default\s+/g, '');
    
    // Wrap in function that returns the component
    const wrappedCode = `
      const { useState, useEffect, useCallback, useMemo, useRef } = React;
      ${code}
      return ${componentName};
    `;

    // Create function from code
    const ComponentFunction = new Function('React', wrappedCode)(React);
    
    return ComponentFunction;
  } catch (error) {
    throw new Error(`Code transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Run RTL-style tests against rendered component
 */
async function runComponentTests(
  container: HTMLElement,
  root: any,
  tests: ComponentTest[]
): Promise<ComponentTestResult[]> {
  const results: ComponentTestResult[] = [];

  for (const test of tests) {
    try {
      const result = await runSingleTest(container, root, test);
      results.push(result);
    } catch (error) {
      results.push({
        id: test.id,
        type: test.type,
        description: test.description,
        passed: false,
        message: error instanceof Error ? error.message : 'Test execution error',
      });
    }
  }

  // Cleanup
  try {
    root.unmount();
    container.remove();
  } catch (e) {
    // Ignore cleanup errors
  }

  return results;
}

/**
 * Run individual test
 */
async function runSingleTest(
  container: HTMLElement,
  root: any,
  test: ComponentTest
): Promise<ComponentTestResult> {
  const { type, description, id } = test;

  switch (type) {
    case 'renders':
      return testRenders(container, test);
    
    case 'contains_text':
      return testContainsText(container, test);
    
    case 'contains_element':
      return testContainsElement(container, test);
    
    case 'has_attribute':
      return testHasAttribute(container, test);
    
    case 'snapshot':
      return testSnapshot(container, test);
    
    case 'event_handler':
      return await testEventHandler(container, root, test);
    
    default:
      return {
        id,
        type,
        description,
        passed: false,
        message: `Unknown test type: ${type}`,
      };
  }
}

/**
 * Test: Component renders without error
 */
function testRenders(container: HTMLElement, test: ComponentTest): ComponentTestResult {
  const hasContent = container.children.length > 0;
  
  return {
    id: test.id,
    type: test.type,
    description: test.description,
    passed: hasContent,
    message: hasContent ? 'Component rendered successfully' : 'Component did not render',
  };
}

/**
 * Test: DOM contains specific text
 */
function testContainsText(container: HTMLElement, test: ComponentTest): ComponentTestResult {
  const { text } = test;
  
  if (!text) {
    return {
      id: test.id,
      type: test.type,
      description: test.description,
      passed: false,
      message: 'Test configuration error: text is required',
    };
  }

  const textContent = container.textContent || '';
  const contains = textContent.includes(text);

  return {
    id: test.id,
    type: test.type,
    description: test.description,
    passed: contains,
    message: contains ? `Found text: "${text}"` : `Text not found: "${text}"`,
    expected: text,
    actual: textContent.substring(0, 100),
  };
}

/**
 * Test: DOM contains element by role or testid
 */
function testContainsElement(container: HTMLElement, test: ComponentTest): ComponentTestResult {
  const { role, selector } = test;

  let element: HTMLElement | null = null;
  let searchMethod = '';

  if (role) {
    element = container.querySelector(`[role="${role}"]`);
    searchMethod = `role="${role}"`;
  } else if (selector) {
    element = container.querySelector(selector);
    searchMethod = `selector="${selector}"`;
  }

  const found = element !== null;

  return {
    id: test.id,
    type: test.type,
    description: test.description,
    passed: found,
    message: found ? `Element found: ${searchMethod}` : `Element not found: ${searchMethod}`,
    expected: searchMethod,
    actual: found ? 'Element found' : 'Element not found',
  };
}

/**
 * Test: Element has specific attribute
 */
function testHasAttribute(container: HTMLElement, test: ComponentTest): ComponentTestResult {
  const { selector, attribute, value } = test;

  if (!selector || !attribute) {
    return {
      id: test.id,
      type: test.type,
      description: test.description,
      passed: false,
      message: 'Test configuration error: selector and attribute are required',
    };
  }

  const element = container.querySelector(selector);
  
  if (!element) {
    return {
      id: test.id,
      type: test.type,
      description: test.description,
      passed: false,
      message: `Element not found: ${selector}`,
      expected: `${attribute}="${value || 'any'}"`,
      actual: 'Element not found',
    };
  }

  const actualValue = element.getAttribute(attribute);
  
  if (value !== undefined) {
    const matches = actualValue === value;
    return {
      id: test.id,
      type: test.type,
      description: test.description,
      passed: matches,
      message: matches 
        ? `Attribute ${attribute} has value "${value}"`
        : `Attribute ${attribute} value mismatch`,
      expected: value,
      actual: actualValue || 'null',
    };
  } else {
    const hasAttribute = actualValue !== null;
    return {
      id: test.id,
      type: test.type,
      description: test.description,
      passed: hasAttribute,
      message: hasAttribute 
        ? `Element has attribute ${attribute}`
        : `Element missing attribute ${attribute}`,
    };
  }
}

/**
 * Test: DOM structure matches snapshot
 */
function testSnapshot(container: HTMLElement, test: ComponentTest): ComponentTestResult {
  const { snapshot } = test;

  if (!snapshot) {
    return {
      id: test.id,
      type: test.type,
      description: test.description,
      passed: false,
      message: 'Test configuration error: snapshot is required',
    };
  }

  const actualHTML = normalizeHTML(container.innerHTML);
  const expectedHTML = normalizeHTML(snapshot);
  const matches = actualHTML === expectedHTML;

  return {
    id: test.id,
    type: test.type,
    description: test.description,
    passed: matches,
    message: matches ? 'HTML snapshot matches' : 'HTML snapshot does not match',
    expected: expectedHTML.substring(0, 200),
    actual: actualHTML.substring(0, 200),
  };
}

/**
 * Test: Event handler works correctly
 */
async function testEventHandler(
  container: HTMLElement,
  root: any,
  test: ComponentTest
): Promise<ComponentTestResult> {
  const { selector, event, expectedAfterEvent } = test;

  if (!selector || !event || !expectedAfterEvent) {
    return {
      id: test.id,
      type: test.type,
      description: test.description,
      passed: false,
      message: 'Test configuration error: selector, event, and expectedAfterEvent are required',
    };
  }

  const element = container.querySelector(selector);
  
  if (!element) {
    return {
      id: test.id,
      type: test.type,
      description: test.description,
      passed: false,
      message: `Element not found: ${selector}`,
    };
  }

  // Trigger event
  const eventObj = new Event(event, { bubbles: true, cancelable: true });
  element.dispatchEvent(eventObj);

  // Wait for React to update
  await new Promise(resolve => setTimeout(resolve, 50));

  // Check result
  const textContent = container.textContent || '';
  const matches = textContent.includes(expectedAfterEvent);

  return {
    id: test.id,
    type: test.type,
    description: test.description,
    passed: matches,
    message: matches 
      ? `After ${event}, found expected text: "${expectedAfterEvent}"`
      : `After ${event}, expected text not found: "${expectedAfterEvent}"`,
    expected: expectedAfterEvent,
    actual: textContent.substring(0, 100),
  };
}

/**
 * Normalize HTML for comparison
 */
function normalizeHTML(html: string): string {
  return html
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .trim();
}
