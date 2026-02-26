/**
 * Event Leads Sync Cron Job
 * 
 * Daily sync of event leads from ticket sites (Ticketplus, Panatickets, En La Taquilla).
 * Scheduled to run at 7:00 AM UTC (2:00 AM Panama time).
 * 
 * This endpoint is protected by the CRON_SECRET environment variable.
 * Vercel Cron Jobs will automatically include this secret in the Authorization header.
 */

import { NextResponse } from 'next/server'
import { runFullEventScan } from '@/lib/scraping'
import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs } from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { logger } from '@/lib/logger'
import { verifyCronSecret } from '@/lib/cron/verify-secret'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for scraping all sites

export async function GET(request: Request) {
  const startTime = Date.now()

  // Verify the request is from Vercel Cron
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempted for event-leads-sync')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  logger.info('Starting event-leads-sync cron job')

  // Start cron job log
  const logResult = await startCronJobLog('event-leads-sync', 'cron')
  const logId = logResult.logId

  try {
    // Run full event scan for all sites (ticketplus, panatickets, enlataquilla)
    const result = await runFullEventScan(
      // Progress callback for logging
      (progress) => {
        logger.info(`[${progress.site}] ${progress.phase}: ${progress.message}`)
      },
      50 // Max 50 events per site
    )

    const durationMs = Date.now() - startTime

    const stats = {
      eventsFound: result.eventsFound,
      newEvents: result.newEvents,
      updatedEvents: result.updatedEvents,
      errors: result.errors.length,
    }

    // Complete the log
    if (logId) {
      await completeCronJobLog(logId, result.success ? 'success' : 'failed', {
        message: `Scanned ${result.eventsFound} events (${result.newEvents} new, ${result.updatedEvents} updated)`,
        details: stats,
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      })
    }

    // If failed, send email notification
    if (!result.success) {
      await sendCronFailureEmail({
        jobName: 'event-leads-sync',
        errorMessage: result.errors.join('; ') || 'Unknown error during event scraping',
        startedAt: new Date(startTime),
        durationMs,
        details: stats,
      })
    }

    // Cleanup old logs (30 days retention)
    await cleanupOldCronJobLogs(30)

    logger.info(`Event-leads-sync cron job completed in ${durationMs}ms`, {
      success: result.success,
      stats,
    })

    return NextResponse.json({
      success: result.success,
      message: `Scanned ${result.eventsFound} events (${result.newEvents} new, ${result.updatedEvents} updated)`,
      duration: `${durationMs}ms`,
      stats,
      errors: result.errors.length > 0 ? result.errors : undefined,
      logId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    logger.error('Event-leads-sync cron job failed:', error)

    // Complete the log as failed
    if (logId) {
      await completeCronJobLog(logId, 'failed', {
        error: errorMessage,
      })
    }

    // Send failure notification
    await sendCronFailureEmail({
      jobName: 'event-leads-sync',
      errorMessage,
      startedAt: new Date(startTime),
      durationMs,
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: `${durationMs}ms`,
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers from admin panel
export async function POST(request: Request) {
  return GET(request)
}
