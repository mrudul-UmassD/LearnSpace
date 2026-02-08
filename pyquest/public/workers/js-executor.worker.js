// Web Worker for safe JavaScript execution in browser
// Runs user code with timeout protection

self.onmessage = function(e) {
  const { code, timeout = 2000 } = e.data;
  
  // Capture console.log output
  const logs = [];
  const customConsole = {
    log: (...args) => {
      // Convert arguments to strings, handling objects/arrays
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return JSON.stringify(arg);
        }
        return String(arg);
      }).join(' ');
      logs.push(message);
    },
    error: (...args) => {
      logs.push('[ERROR] ' + args.join(' '));
    },
    warn: (...args) => {
      logs.push('[WARN] ' + args.join(' '));
    }
  };

  // Set up timeout
  const timeoutId = setTimeout(() => {
    self.postMessage({
      success: false,
      error: 'Execution timeout: Code took longer than ' + timeout + 'ms',
      output: logs.join('\n')
    });
  }, timeout);

  try {
    // Create a sandboxed function with custom console
    const sandboxedFunction = new Function('console', code);
    
    // Execute the code
    sandboxedFunction(customConsole);
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Send results back
    self.postMessage({
      success: true,
      output: logs.join('\n'),
      error: null
    });
  } catch (error) {
    clearTimeout(timeoutId);
    self.postMessage({
      success: false,
      error: error.message,
      output: logs.join('\n')
    });
  }
};
