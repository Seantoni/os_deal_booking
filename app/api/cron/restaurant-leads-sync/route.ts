/**
 * Restaurant Leads Sync Cron Job
 * 
 * Daily sync of restaurant leads from Degusta Panama.
 * 
 * ⚠️  DISABLED — Degusta is behind Cloudflare which blocks headless browsers.
 *     The scraper always fails.  Re-enable once we have an alternative
 *     (e.g. their underlying API, or a Cloudflare-bypass scraping service).
 * 
 * This endpoint is protected by the CRON_SECRET environment variable.
 * Vercel Cron Jobs will automatically include this secret in the Authorization header.
 */

import { NextResponse } from 'next/server'
// import { runFullRestaurantScan } from '@/lib/scraping'
// import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs } from '@/app/actions/cron-logs'
// import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Disabled — Degusta blocked by Cloudflare
const DISABLED = true

/**
 * Verify the cron secret to ensure only Vercel can trigger this endpoint
 */
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // In development, allow requests without the secret
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    return true
  }
  
  if (!cronSecret) {
    logger.warn('CRON_SECRET is not configured')
    return false
  }
  
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (DISABLED) {
    logger.info('restaurant-leads-sync is disabled (Degusta blocked by Cloudflare)')
    return NextResponse.json({
      success: false,
      message: 'Disabled — Degusta is blocked by Cloudflare. Re-enable when an alternative is available.',
    })
  }

  // Verify the request is from Vercel Cron
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempted for restaurant-leads-sync')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({ success: false, message: 'Disabled' })
}

// Also support POST for manual triggers from admin panel
export async function POST(request: Request) {
  return GET(request)
}
