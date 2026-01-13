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
 * 
 * For Sentry-specific tracing and spans, use:
 *   import { traceServerAction, traceApiCall, captureError } from '@/lib/sentry'
 */

import { captureError, sentryLogger } from '@/lib/sentry'

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
 * Convert args to a data object for Sentry
 */
function argsToData(args: unknown[]): Record<string, unknown> | undefined {
  const nonErrorArgs = args.filter(arg => !(arg instanceof Error))
  if (nonErrorArgs.length === 0) return undefined
  if (nonErrorArgs.length === 1 && typeof nonErrorArgs[0] === 'object') {
    return nonErrorArgs[0] as Record<string, unknown>
  }
  return { args: nonErrorArgs }
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
    // Also send to Sentry as breadcrumb for context
    sentryLogger.debug(msg, argsToData(args))
  },

  /**
   * Info logs - general information
   * Shown when LOG_LEVEL=debug or LOG_LEVEL=info
   */
  info: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.info(`[INFO] ${msg}`, ...args)
    }
    // Send to Sentry as breadcrumb
    sentryLogger.info(msg, argsToData(args))
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
    // Send to Sentry
    sentryLogger.warn(msg, argsToData(args))
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
      captureError(error, {
        message: msg,
        ...argsToData(args),
      })
    } else {
      // Send as error message to Sentry
      sentryLogger.error(msg, argsToData(args))
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
  
  // Set additional context for Sentry
  if (context) {
    import('@/lib/sentry').then(({ setContext }) => {
      setContext('serverAction', {
        actionName,
        ...context,
      })
    })
  }
}
