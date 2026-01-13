/**
 * Sentry Edge Configuration
 * 
 * This file configures the Sentry SDK for Edge Runtime (middleware, edge functions).
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 1.0,

  // Enable structured logging
  _experiments: {
    enableLogs: true,
  },

  // Debug mode
  debug: false,

  // Environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Only enable if DSN is set
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
})
