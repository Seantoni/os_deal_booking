/**
 * Sentry Edge Configuration
 * 
 * This file configures the Sentry SDK for Edge Runtime (middleware, edge functions).
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: false,

  // Environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Only enable if DSN is set
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
})
