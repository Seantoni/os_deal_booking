/**
 * Environment configuration and validation
 *
 * Centralizes access to environment variables and validates that required
 * values are present at startup (except in test environments).
 *
 * Usage:
 *   import { ENV, getAppBaseUrl } from '@/lib/config/env'
 *
 *   const apiKey = ENV.OPENAI_API_KEY
 *   const baseUrl = getAppBaseUrl()
 */

type NodeEnv = 'development' | 'test' | 'production'

const NODE_ENV = (process.env.NODE_ENV as NodeEnv) || 'development'
const IS_DEV = NODE_ENV === 'development'
const IS_TEST = NODE_ENV === 'test'
const IS_PROD = NODE_ENV === 'production'

interface GetEnvOptions {
  required?: boolean
  defaultValue?: string
}

function getEnv(name: string, options: GetEnvOptions = {}): string | null {
  const value = process.env[name] ?? options.defaultValue ?? null

  if (options.required && !value && !IS_TEST) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

/**
 * Centralized, validated environment values
 *
 * IMPORTANT: This module is intended for server-side usage only.
 * Do NOT import it from client components or browser-only code.
 */
export const ENV = {
  NODE_ENV,
  IS_DEV,
  IS_TEST,
  IS_PROD,

  /**
   * Database URL used by Prisma (validated for presence)
   */
  DATABASE_URL: getEnv('DATABASE_URL', { required: true })!,

  /**
   * Secret key used for signing tokens (approval/public links)
   */
  TOKEN_SECRET_KEY: getEnv('TOKEN_SECRET_KEY', { required: true })!,

  /**
   * OpenAI API key for AI features
   */
  OPENAI_API_KEY: getEnv('OPENAI_API_KEY', { required: true })!,

  /**
   * Resend API key for transactional emails
   */
  RESEND_API_KEY: getEnv('RESEND_API_KEY', { required: true })!,

  /**
   * Optional email configuration
   */
  EMAIL_FROM: getEnv('EMAIL_FROM'),
  EMAIL_REPLY_TO: getEnv('EMAIL_REPLY_TO'),

  /**
   * Optional public app URL (used to build absolute URLs in emails)
   * When not set in development, we fall back to http://localhost:3000.
   */
  NEXT_PUBLIC_APP_URL: getEnv('NEXT_PUBLIC_APP_URL'),

  /**
   * AWS S3 Configuration (optional - only needed for image uploads)
   */
  AWS_ACCESS_KEY_ID: getEnv('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getEnv('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: getEnv('AWS_REGION', { defaultValue: 'us-east-1' }),
  AWS_S3_BUCKET: getEnv('AWS_S3_BUCKET'),
}

/**
 * Normalize a base URL by stripping a trailing slash
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '')
}

/**
 * Get the base URL for the application.
 *
 * In non-production environments, falls back to http://localhost:3000
 * when NEXT_PUBLIC_APP_URL is not set. In production, NEXT_PUBLIC_APP_URL
 * must be configured.
 */
export function getAppBaseUrl(): string {
  if (ENV.NEXT_PUBLIC_APP_URL) {
    return normalizeBaseUrl(ENV.NEXT_PUBLIC_APP_URL)
  }

  if (ENV.IS_DEV || ENV.IS_TEST) {
    return 'http://localhost:3000'
  }

  throw new Error(
    'NEXT_PUBLIC_APP_URL is required in production. Please set it in your environment configuration.'
  )
}


