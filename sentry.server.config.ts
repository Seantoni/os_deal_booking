/**
 * Sentry Server Configuration
 * 
 * This file configures the Sentry SDK for the server-side (Node.js runtime).
 * It runs when server-side code is executed.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring - sample 100% of transactions
  tracesSampleRate: 1.0,

  // Capture 100% of errors
  sampleRate: 1.0,

  // Enable structured logging
  _experiments: {
    enableLogs: true,
  },

  // Debug mode (set to true when troubleshooting)
  debug: false,

  // Environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Only enable if DSN is set
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Integrations
  integrations: [
    // Capture console.warn and console.error as logs
    Sentry.consoleLoggingIntegration({ 
      levels: ['warn', 'error'] 
    }),
  ],

  // Filter out non-critical errors
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null
    }
    return event
  },
})
