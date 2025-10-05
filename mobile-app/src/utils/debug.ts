/**
 * Debug utility for SentryCircle Mobile App
 * 
 * This module provides debugging tools for the React Native environment.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const DEBUG_STORAGE_KEY = '@SentryCircle:debug_logs';
const MAX_LOG_ENTRIES = 1000;

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
  screen?: string;
}

/**
 * Debug class for managing logs
 */
class Debug {
  private logs: LogEntry[] = [];
  private isDebugMode: boolean = __DEV__;
  private currentScreen: string = 'App';

  constructor() {
    this.loadLogs();
  }

  /**
   * Load logs from AsyncStorage
   */
  private async loadLogs(): Promise<void> {
    try {
      const storedLogs = await AsyncStorage.getItem(DEBUG_STORAGE_KEY);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('Failed to load debug logs:', error);
    }
  }

  /**
   * Save logs to AsyncStorage
   */
  private async saveLogs(): Promise<void> {
    try {
      // Trim logs if they exceed the maximum
      if (this.logs.length > MAX_LOG_ENTRIES) {
        this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
      }
      
      await AsyncStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save debug logs:', error);
    }
  }

  /**
   * Set the current screen name for context
   * @param screenName The name of the current screen
   */
  public setCurrentScreen(screenName: string): void {
    this.currentScreen = screenName;
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
      screen: this.currentScreen,
    };

    // Add to in-memory logs
    this.logs.push(logEntry);

    // Save to storage (async)
    this.saveLogs();

    // Also log to console in development mode
    if (__DEV__ || this.isDebugMode) {
      const formattedMessage = `[${level}] [${this.currentScreen}] ${message}`;
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
  public async clearLogs(): Promise<void> {
    this.logs = [];
    try {
      await AsyncStorage.removeItem(DEBUG_STORAGE_KEY);
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
        return `[${log.timestamp}] [${log.level}] [${log.screen}] ${log.message} ${dataStr}`;
      })
      .join('\n');
  }

  /**
   * Get device information for debugging
   * @returns Object with device information
   */
  public getDeviceInfo(): object {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      isEmulator: Platform.OS === 'ios' ? false : false, // Would need additional checks
      brand: Platform.OS === 'android' ? 'Android Device' : 'iOS Device', // Would need native module
      model: Platform.OS === 'android' ? 'Android Model' : 'iOS Model', // Would need native module
      appVersion: '1.0.0', // Would come from package.json
      buildNumber: '1', // Would come from build config
    };
  }
}

// Export a singleton instance
export const debug = new Debug();

// Export a hook for use in components
export function useDebug() {
  return debug;
}
