/**
 * Debug utility for SentryCircle Web Dashboard
 * 
 * This module provides debugging tools for the React web environment.
 */

// Debug levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  component?: string;
}

/**
 * Debug class for managing logs
 */
class Debug {
  private logs: LogEntry[] = [];
  private isDebugMode: boolean = process.env.NODE_ENV === 'development';
  private currentComponent: string = 'App';
  private maxLogEntries: number = 1000;

  constructor() {
    this.loadLogs();
  }

  /**
   * Load logs from localStorage
   */
  private loadLogs(): void {
    try {
      const storedLogs = localStorage.getItem('sentrycircle_debug_logs');
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('Failed to load debug logs:', error);
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveLogs(): void {
    try {
      // Trim logs if they exceed the maximum
      if (this.logs.length > this.maxLogEntries) {
        this.logs = this.logs.slice(-this.maxLogEntries);
      }
      
      localStorage.setItem('sentrycircle_debug_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save debug logs:', error);
    }
  }

  /**
   * Set the current component name for context
   * @param componentName The name of the current component
   */
  public setCurrentComponent(componentName: string): void {
    this.currentComponent = componentName;
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
  }

  /**
   * Log a message at the specified level
   * @param level The log level
   * @param message The message to log
   * @param data Optional data to include
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      data,
      component: this.currentComponent,
    };

    // Add to in-memory logs
    this.logs.push(logEntry);

    // Save to storage
    this.saveLogs();

    // Also log to console in development mode or if debug mode is enabled
    if (process.env.NODE_ENV === 'development' || this.isDebugMode) {
      const formattedMessage = `[${level}] [${this.currentComponent}] ${message}`;
      switch (level) {
        case LogLevel.DEBUG:
          console.log(formattedMessage, data || '');
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data || '');
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, data || '');
          break;
      }
    }
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param data Optional data to include
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param data Optional data to include
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param data Optional data to include
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param error The error object or message
   * @param data Optional additional data
   */
  public error(message: string, error?: Error | string, data?: any): void {
    let errorData: any = data || {};
    
    if (error instanceof Error) {
      errorData = {
        ...errorData,
        errorMessage: error.message,
        stack: error.stack,
      };
    } else if (typeof error === 'string') {
      errorData = {
        ...errorData,
        errorMessage: error,
      };
    }
    
    this.log(LogLevel.ERROR, message, errorData);
  }

  /**
   * Get all logs
   * @returns Array of log entries
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem('sentrycircle_debug_logs');
    } catch (error) {
      console.error('Failed to clear debug logs:', error);
    }
  }

  /**
   * Export logs as a string
   * @returns Formatted log string
   */
  public exportLogs(): string {
    return this.logs
      .map(log => {
        const dataStr = log.data ? JSON.stringify(log.data) : '';
        return `[${log.timestamp}] [${log.level}] [${log.component}] ${log.message} ${dataStr}`;
      })
      .join('\n');
  }

  /**
   * Create a performance monitor for React components
   * @param componentName The name of the component to monitor
   * @returns Object with start and end methods
   */
  public createPerformanceMonitor(componentName: string) {
    return {
      start: (operationName: string) => {
        const startTime = performance.now();
        return {
          end: () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            this.debug(`Performance: ${operationName}`, {
              component: componentName,
              duration: `${duration.toFixed(2)}ms`,
            });
            return duration;
          }
        };
      }
    };
  }

  /**
   * Get browser information for debugging
   * @returns Object with browser information
   */
  public getBrowserInfo(): object {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      cookiesEnabled: navigator.cookieEnabled,
    };
  }
}

// Export a singleton instance
export const debug = new Debug();

// React hook for using debug in components
export function useDebug() {
  return debug;
}
