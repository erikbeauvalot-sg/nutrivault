/**
 * Logger Utility
 *
 * Provides environment-aware logging that:
 * - Only outputs debug/info logs in development mode
 * - Always outputs warnings and errors
 * - Can be easily extended for remote logging in production
 */

const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';

/**
 * Logger object with environment-aware methods
 *
 * @example
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('Debug info', { data });  // Only in dev
 * logger.info('Info message');           // Only in dev
 * logger.warn('Warning');                // Always
 * logger.error('Error', error);          // Always
 */
export const logger = {
  /**
   * Debug level logging - only in development
   * Use for detailed debugging information
   */
  debug: (message, ...args) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Info level logging - only in development
   * Use for general information
   */
  info: (message, ...args) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Warning level logging - always shown
   * Use for potential issues that don't break functionality
   */
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Error level logging - always shown
   * Use for errors and exceptions
   */
  error: (message, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Group logging - only in development
   * Creates a collapsible group in the console
   */
  group: (label) => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * End group - only in development
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },

  /**
   * Table logging - only in development
   * Displays data in table format
   */
  table: (data) => {
    if (isDev) {
      console.table(data);
    }
  },

  /**
   * Time tracking - only in development
   */
  time: (label) => {
    if (isDev) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (isDev) {
      console.timeEnd(label);
    }
  }
};

export default logger;
