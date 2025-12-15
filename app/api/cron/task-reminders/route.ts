/**
 * Task Reminder Cron Job
 * 
 * Sends daily task reminder emails to users with pending tasks.
 * Scheduled to run at 8:00 AM Panama time (13:00 UTC).
 * 
 * This endpoint is protected by the CRON_SECRET environment variable.
 * Vercel Cron Jobs will automatically include this secret in the Authorization header.
 */

import { NextResponse } from 'next/server'
import { sendAllTaskReminders } from '@/lib/email'
import { logger } from '@/lib/logger'

// Vercel cron jobs require this export to configure the schedule
// 8:00 AM Panama (UTC-5) = 13:00 UTC
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for sending emails

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
  // Verify the request is from Vercel Cron
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempted')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  logger.info('Starting task reminder cron job')
  const startTime = Date.now()

  try {
    const result = await sendAllTaskReminders()
    const duration = Date.now() - startTime

    logger.info(`Task reminder cron job completed in ${duration}ms`, {
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    })

    return NextResponse.json({
      success: result.success,
      message: `Task reminders processed: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
      duration: `${duration}ms`,
      details: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Task reminder cron job failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers from admin panel
export async function POST(request: Request) {
  return GET(request)
}

