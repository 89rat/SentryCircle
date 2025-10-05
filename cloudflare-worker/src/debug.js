/**
 * Debug utility for SentryCircle Cloudflare Worker
 * 
 * This module provides debugging tools for the Cloudflare Worker environment.
 */

/**
 * Log a message with a timestamp and optional data
 * @param {string} message - The message to log
 * @param {any} data - Optional data to include in the log
 */
export function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    data,
  };
  
  console.log(JSON.stringify(logEntry));
}

/**
 * Log an error with stack trace and optional data
 * @param {Error} error - The error object
 * @param {any} data - Optional data to include in the log
 */
export function logError(error, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    error: error.message,
    stack: error.stack,
    data,
  };
  
  console.error(JSON.stringify(logEntry));
}

/**
 * Create a request logger middleware
 * @returns {Function} Middleware function
 */
export function requestLogger() {
  return async (request, handler) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    log(`Request started: ${request.method} ${new URL(request.url).pathname}`, {
      requestId,
      headers: Object.fromEntries(request.headers),
      cf: request.cf,
    });
    
    try {
      const response = await handler(request);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      log(`Request completed: ${response.status}`, {
        requestId,
        duration,
        status: response.status,
        headers: Object.fromEntries(response.headers),
      });
      
      return response;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      logError(error, {
        requestId,
        duration,
        url: request.url,
        method: request.method,
      });
      
      throw error;
    }
  };
}

/**
 * Create a performance monitoring middleware
 * @returns {Function} Middleware function
 */
export function performanceMonitor() {
  return async (request, handler) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const startTime = Date.now();
    
    try {
      const response = await handler(request);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log performance data for slow requests (over 500ms)
      if (duration > 500) {
        log(`Slow request detected: ${path}`, {
          duration,
          method: request.method,
          status: response.status,
        });
      }
      
      return response;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      logError(error, {
        duration,
        path,
        method: request.method,
      });
      
      throw error;
    }
  };
}

/**
 * Create a KV operation logger
 * @param {KVNamespace} namespace - The KV namespace to wrap
 * @returns {Object} Wrapped KV namespace with logging
 */
export function createKVLogger(namespace) {
  return {
    get: async (key, options) => {
      const startTime = Date.now();
      try {
        const value = await namespace.get(key, options);
        const endTime = Date.now();
        log(`KV.get: ${key}`, {
          duration: endTime - startTime,
          found: value !== null,
          options,
        });
        return value;
      } catch (error) {
        logError(error, { operation: 'get', key, options });
        throw error;
      }
    },
    
    put: async (key, value, options) => {
      const startTime = Date.now();
      try {
        await namespace.put(key, value, options);
        const endTime = Date.now();
        log(`KV.put: ${key}`, {
          duration: endTime - startTime,
          valueSize: typeof value === 'string' ? value.length : 'non-string',
          options,
        });
      } catch (error) {
        logError(error, { operation: 'put', key, options });
        throw error;
      }
    },
    
    delete: async (key) => {
      const startTime = Date.now();
      try {
        await namespace.delete(key);
        const endTime = Date.now();
        log(`KV.delete: ${key}`, {
          duration: endTime - startTime,
        });
      } catch (error) {
        logError(error, { operation: 'delete', key });
        throw error;
      }
    },
    
    list: async (options) => {
      const startTime = Date.now();
      try {
        const list = await namespace.list(options);
        const endTime = Date.now();
        log(`KV.list`, {
          duration: endTime - startTime,
          count: list.keys.length,
          options,
        });
        return list;
      } catch (error) {
        logError(error, { operation: 'list', options });
        throw error;
      }
    },
  };
}

/**
 * Enable debug mode for the worker
 * @param {Object} env - The worker environment
 * @returns {Object} Modified environment with debug wrappers
 */
export function enableDebugMode(env) {
  const debugEnv = { ...env };
  
  // Wrap KV namespaces with logging
  if (env.SENTRYCIRCLE_KV) {
    debugEnv.SENTRYCIRCLE_KV = createKVLogger(env.SENTRYCIRCLE_KV);
  }
  
  return debugEnv;
}
