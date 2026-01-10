/**
 * Logger utility for the NOP frontend.
 * 
 * In development mode, logs to console.
 * In production mode, only logs warnings and errors.
 * 
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.debug('Processing data', { id: 123 });
 */

const isDev = process.env.NODE_ENV === 'development';

type LogArgs = unknown[];

export const logger = {
  /**
   * Debug-level logging. Only outputs in development.
   */
  debug: (...args: LogArgs): void => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info-level logging. Only outputs in development.
   */
  info: (...args: LogArgs): void => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning-level logging. Always outputs.
   */
  warn: (...args: LogArgs): void => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error-level logging. Always outputs.
   */
  error: (...args: LogArgs): void => {
    console.error('[ERROR]', ...args);
  },
};

export default logger;
