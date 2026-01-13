/**
 * Sentry Client Configuration
 * 
 * This file configures the Sentry SDK for the browser/client-side.
 * It runs when the application loads in the browser.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring - sample 100% of transactions
  tracesSampleRate: 1.0,
  
  // Capture 100% of errors in production
  sampleRate: 1.0,

  // Enable structured logging
  _experiments: {
    enableLogs: true,
  },

  // Debug mode (set to true when troubleshooting)
  debug: false,

  // Session Replay configuration
  replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
  replaysSessionSampleRate: 0.1, // Capture 10% of all sessions

  // Integrations
  integrations: [
    // Session replay for debugging user issues
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Browser performance tracing
    Sentry.browserTracingIntegration(),
    // Capture console.warn and console.error as logs
    Sentry.consoleLoggingIntegration({ 
      levels: ['warn', 'error'] 
    }),
  ],

  // Environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Only enable in production if DSN is set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filter out non-critical errors
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null
    }
    return event
  },
})
