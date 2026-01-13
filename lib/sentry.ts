/**
 * Sentry Utilities
 * 
 * Centralized Sentry helpers for consistent error tracking, tracing, and logging.
 * 
 * Usage:
 *   import { captureError, traceAction, traceApiCall, sentryLogger } from '@/lib/sentry'
 * 
 * Exception Catching:
 *   captureError(error, { context: 'additional info' })
 * 
 * Tracing Actions:
 *   traceAction('button.click', 'Save Button', async (span) => {
 *     span.setAttribute('itemId', id)
 *     await saveItem()
 *   })
 * 
 * Tracing API Calls:
 *   const data = await traceApiCall('GET', '/api/users', () => fetch('/api/users'))
 * 
 * Structured Logging:
 *   sentryLogger.info('User logged in', { userId: 123 })
 *   sentryLogger.error('Payment failed', { orderId: 'order_123', amount: 99.99 })
 */

import * as Sentry from '@sentry/nextjs'

// ============================================================================
// Exception Catching
// ============================================================================

/**
 * Capture an exception with optional context
 * Use in try-catch blocks or error boundaries
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (error instanceof Error) {
    Sentry.captureException(error, {
      extra: context,
    })
  } else {
    Sentry.captureException(new Error(String(error)), {
      extra: { originalError: error, ...context },
    })
  }
}

/**
 * Capture a message (for non-error events that should be tracked)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  })
}

// ============================================================================
// Tracing / Spans
// ============================================================================

type SpanCallback<T> = (span: Sentry.Span) => T | Promise<T>

/**
 * Trace a UI action (button clicks, form submissions, etc.)
 * 
 * @example
 * const handleSave = () => {
 *   traceAction('ui.click', 'Save Button', async (span) => {
 *     span.setAttribute('itemId', item.id)
 *     await saveItem(item)
 *   })
 * }
 */
export function traceAction<T>(
  operation: string,
  name: string,
  callback: SpanCallback<T>
): T | Promise<T> {
  return Sentry.startSpan(
    {
      op: operation,
      name,
    },
    callback
  )
}

/**
 * Trace an API call with automatic timing
 * 
 * @example
 * const users = await traceApiCall('GET', '/api/users', async () => {
 *   const res = await fetch('/api/users')
 *   return res.json()
 * })
 */
export async function traceApiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  callback: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'http.client',
      name: `${method} ${endpoint}`,
    },
    async (span) => {
      // Add custom attributes
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value)
        })
      }
      
      const startTime = Date.now()
      try {
        const result = await callback()
        span.setAttribute('http.response_time_ms', Date.now() - startTime)
        span.setAttribute('http.status', 'success')
        return result
      } catch (error) {
        span.setAttribute('http.response_time_ms', Date.now() - startTime)
        span.setAttribute('http.status', 'error')
        throw error
      }
    }
  )
}

/**
 * Trace a server action
 * 
 * @example
 * export async function createBusiness(formData: FormData) {
 *   return traceServerAction('createBusiness', async (span) => {
 *     const name = formData.get('name')
 *     span.setAttribute('business.name', name)
 *     // ... create business
 *   })
 * }
 */
export async function traceServerAction<T>(
  actionName: string,
  callback: SpanCallback<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'server.action',
      name: actionName,
    },
    async (span) => {
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value)
        })
      }
      return callback(span)
    }
  )
}

/**
 * Trace a database operation
 * 
 * @example
 * const users = await traceDbQuery('findMany', 'users', async () => {
 *   return prisma.user.findMany()
 * })
 */
export async function traceDbQuery<T>(
  operation: string,
  table: string,
  callback: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'db.query',
      name: `${operation} ${table}`,
    },
    async (span) => {
      span.setAttribute('db.table', table)
      span.setAttribute('db.operation', operation)
      return callback()
    }
  )
}

// ============================================================================
// Structured Logging (Sentry Logger)
// ============================================================================

/**
 * Sentry structured logger
 * Sends logs to Sentry's logging system for centralized monitoring
 * 
 * @example
 * sentryLogger.info('User action', { userId: 123, action: 'login' })
 * sentryLogger.error('Payment failed', { orderId: 'order_123', amount: 99.99 })
 */
export const sentryLogger = {
  /**
   * Trace level - very detailed debugging information
   */
  trace: (message: string, data?: Record<string, unknown>): void => {
    Sentry.addBreadcrumb({
      category: 'trace',
      message,
      level: 'debug',
      data,
    })
  },

  /**
   * Debug level - debugging information
   */
  debug: (message: string, data?: Record<string, unknown>): void => {
    Sentry.addBreadcrumb({
      category: 'debug',
      message,
      level: 'debug',
      data,
    })
  },

  /**
   * Info level - general information
   */
  info: (message: string, data?: Record<string, unknown>): void => {
    Sentry.addBreadcrumb({
      category: 'info',
      message,
      level: 'info',
      data,
    })
  },

  /**
   * Warn level - warning messages
   */
  warn: (message: string, data?: Record<string, unknown>): void => {
    Sentry.addBreadcrumb({
      category: 'warning',
      message,
      level: 'warning',
      data,
    })
    // Also capture as a Sentry message for visibility
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: data,
      })
    }
  },

  /**
   * Error level - error messages (automatically captured)
   */
  error: (message: string, data?: Record<string, unknown>): void => {
    Sentry.addBreadcrumb({
      category: 'error',
      message,
      level: 'error',
      data,
    })
    // Capture error messages to Sentry
    Sentry.captureMessage(message, {
      level: 'error',
      extra: data,
    })
  },

  /**
   * Fatal level - critical errors
   */
  fatal: (message: string, data?: Record<string, unknown>): void => {
    Sentry.addBreadcrumb({
      category: 'fatal',
      message,
      level: 'fatal',
      data,
    })
    // Capture fatal messages to Sentry with highest priority
    Sentry.captureMessage(message, {
      level: 'fatal',
      extra: data,
    })
  },
}

// ============================================================================
// User Context
// ============================================================================

/**
 * Set user context for Sentry (call after user logs in)
 */
export function setUser(user: {
  id: string
  email?: string
  username?: string
  role?: string
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    // Role is stored as extra data since Sentry.User doesn't have a role field
    ...user.role ? { role: user.role } : {},
  })
}

/**
 * Clear user context (call on logout)
 */
export function clearUser(): void {
  Sentry.setUser(null)
}

// ============================================================================
// Context & Tags
// ============================================================================

/**
 * Set additional context for error reports
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  Sentry.setContext(name, context)
}

/**
 * Set a tag for filtering in Sentry
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value)
}

// Re-export Sentry for direct access when needed
export { Sentry }
