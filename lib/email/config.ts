import { Resend } from 'resend'
import { ENV } from '@/lib/config/env'

// Initialize Resend client using validated environment configuration
const resend = new Resend(ENV.RESEND_API_KEY)

// Use Resend's test domain for development, or verified domain for production
// For testing: Use onboarding@resend.dev (works without domain verification)
// For production: Use your verified domain (jose.paez@ofertasimple.com)
const getFromEmail = () => {
  // Explicit configuration wins
  if (ENV.EMAIL_FROM) {
    return ENV.EMAIL_FROM
  }

  // Default to Resend's test domain for local development
  if (!ENV.NEXT_PUBLIC_APP_URL || ENV.IS_DEV || ENV.IS_TEST) {
    return 'onboarding@resend.dev'
  }

  // Production: use verified domain
  return 'jose.paez@ofertasimple.com'
}

export const EMAIL_CONFIG = {
  from: getFromEmail(),
  replyTo: ENV.EMAIL_REPLY_TO || getFromEmail(),
}

export { resend }

