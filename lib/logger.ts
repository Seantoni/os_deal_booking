/**
 * Centralized logging utility with log levels and Sentry integration
 * 
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   
 *   logger.debug('Debug message', { data })
 *   logger.info('Info message')
 *   logger.warn('Warning message')
 *   logger.error('Error message', error)
 * 
 * Log levels (from most to least verbose):
 * - debug: All logs (development only)
 * - info: Info, warnings, and errors
 * - warn: Warnings and errors only (default)
 * - error: Errors only
 * 
 * Set LOG_LEVEL environment variable to control output:
 *   LOG_LEVEL=debug npm run dev
 *   LOG_LEVEL=error npm run build
 */

import * as Sentry from '@sentry/nextjs'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'warn'

/**
 * Check if a log level should be output based on current LOG_LEVEL setting
 */
function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
  const currentIndex = levels.indexOf(LOG_LEVEL)
  const messageIndex = levels.indexOf(level)
  return messageIndex >= currentIndex
}

/**
 * Extract error from args if present
 */
function extractError(args: unknown[]): Error | undefined {
  for (const arg of args) {
    if (arg instanceof Error) {
      return arg
    }
  }
  return undefined
}

/**
 * Centralized logger with log levels and Sentry integration
 */
export const logger = {
  /**
   * Debug logs - detailed information for development
   * Only shown when LOG_LEVEL=debug
   */
  debug: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.log(`[DEBUG] ${msg}`, ...args)
    }
  },

  /**
   * Info logs - general information
   * Shown when LOG_LEVEL=debug or LOG_LEVEL=info
   */
  info: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.info(`[INFO] ${msg}`, ...args)
    }
  },

  /**
   * Warning logs - potential issues that don't break functionality
   * Shown when LOG_LEVEL=debug, info, or warn (default)
   * Also sends to Sentry as a breadcrumb
   */
  warn: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${msg}`, ...args)
    }
    
    // Add warning as Sentry breadcrumb for context
    Sentry.addBreadcrumb({
      category: 'warning',
      message: msg,
      level: 'warning',
      data: args.length > 0 ? { args } : undefined,
    })
  },

  /**
   * Error logs - errors that need attention
   * Always shown regardless of LOG_LEVEL
   * Also captures in Sentry for tracking
   */
  error: (msg: string, ...args: unknown[]): void => {
    // Errors are always logged
    console.error(`[ERROR] ${msg}`, ...args)
    
    // Extract error if present in args
    const error = extractError(args)
    
    if (error) {
      // Capture the actual error with context
      Sentry.captureException(error, {
        extra: {
          message: msg,
          args: args.filter(arg => !(arg instanceof Error)),
        },
      })
    } else {
      // Capture as a message if no error object
      Sentry.captureMessage(msg, {
        level: 'error',
        extra: args.length > 0 ? { args } : undefined,
      })
    }
  },
}

/**
 * Get current log level (useful for conditional logic)
 */
export function getLogLevel(): LogLevel {
  return LOG_LEVEL
}

/**
 * Check if debug logging is enabled
 */
export function isDebugEnabled(): boolean {
  return LOG_LEVEL === 'debug'
}

/**
 * Log a server action error with context
 * Convenience function for server actions
 */
export function logServerActionError(
  actionName: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  logger.error(`Server action "${actionName}" failed: ${errorMessage}`, error)
  
  if (context) {
    Sentry.setContext('serverAction', {
      actionName,
      ...context,
    })
  }
}