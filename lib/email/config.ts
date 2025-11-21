import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Use Resend's test domain for development, or verified domain for production
// For testing: Use onboarding@resend.dev (works without domain verification)
// For production: Use your verified domain (jose.paez@ofertasimple.com)
const getFromEmail = () => {
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM
  }
  // Default to Resend's test domain for local development
  if (process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_APP_URL?.includes('vercel.app')) {
    return 'onboarding@resend.dev'
  }
  // Production: use verified domain
  return 'jose.paez@ofertasimple.com'
}

export const EMAIL_CONFIG = {
  from: getFromEmail(),
  replyTo: process.env.EMAIL_REPLY_TO || getFromEmail(),
}

export { resend }

