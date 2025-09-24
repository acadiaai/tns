// Console logger that forwards logs to Vite server
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

const sendToServer = (level: string, args: any[]) => {
  try {
    // Convert args to string representations with better error handling
    const message = args.map(arg => {
      try {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          // Handle circular references
          const seen = new WeakSet();
          return JSON.stringify(arg, (_key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular]';
              }
              seen.add(value);
            }
            return value;
          }, 2);
        }
        return String(arg);
      } catch (e) {
        return '[Object with circular reference]';
      }
    }).join(' ');

    // Only send if we're in development mode
    if (import.meta.env.DEV) {
      // Send to a special endpoint on the Vite server
      fetch('http://localhost:5173/__console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      }).catch(() => {
        // Silently fail to avoid infinite loops
      });
    }
  } catch (e) {
    // Silently fail
  }
};

// Override console methods
export const setupConsoleLogger = () => {
  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    sendToServer('log', args);
  };

  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    sendToServer('error', args);
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    sendToServer('warn', args);
  };

  console.info = (...args: any[]) => {
    originalConsole.info(...args);
    sendToServer('info', args);
  };

  console.debug = (...args: any[]) => {
    originalConsole.debug(...args);
    sendToServer('debug', args);
  };

  // Log that console logger is set up
  console.log('[Console Logger] Client logs will be forwarded to Vite server');
};