/**
 * Sentry Server Configuration
 * 
 * This file configures the Sentry SDK for the server-side (Node.js runtime).
 * It runs when server-side code is executed.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Capture 100% of errors
  sampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: false,

  // Environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Only enable if DSN is set
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Integrations
  integrations: [
    // Add profiling if needed
    // Sentry.nodeProfilingIntegration(),
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
