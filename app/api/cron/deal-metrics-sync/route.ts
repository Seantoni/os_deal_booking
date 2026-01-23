/**
 * Deal Metrics Sync Cron Job
 * 
 * Daily sync of deal metrics from external Oferta API.
 * Scheduled to run at midnight Panama time (05:00 UTC).
 * 
 * This endpoint is protected by the CRON_SECRET environment variable.
 * Vercel Cron Jobs will automatically include this secret in the Authorization header.
 */

import { NextResponse } from 'next/server'
import { syncDealMetrics } from '@/app/actions/deal-metrics'
import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs } from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for syncing

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
  const startTime = Date.now()

  // Verify the request is from Vercel Cron
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempted for deal-metrics-sync')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  logger.info('Starting deal-metrics-sync cron job')

  // Start cron job log
  const logResult = await startCronJobLog('deal-metrics-sync', 'cron')
  const logId = logResult.logId

  try {
    // Sync deal metrics for the last 1 day
    const result = await syncDealMetrics({
      sinceDays: 1,
      userId: 'system-cron',
      fetchAll: true,
    })

    const durationMs = Date.now() - startTime

    // Complete the log
    if (logId) {
      await completeCronJobLog(logId, result.success ? 'success' : 'failed', {
        message: result.message,
        details: result.stats as Record<string, unknown>,
        error: result.error,
      })
    }

    // If failed, send email notification
    if (!result.success) {
      await sendCronFailureEmail({
        jobName: 'deal-metrics-sync',
        errorMessage: result.error || result.message,
        startedAt: new Date(startTime),
        durationMs,
        details: result.stats as Record<string, unknown>,
      })
    }

    // Cleanup old logs (30 days retention)
    await cleanupOldCronJobLogs(30)

    logger.info(`Deal-metrics-sync cron job completed in ${durationMs}ms`, {
      success: result.success,
      stats: result.stats,
    })

    return NextResponse.json({
      success: result.success,
      message: result.message,
      duration: `${durationMs}ms`,
      stats: result.stats,
      logId: result.logId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    logger.error('Deal-metrics-sync cron job failed:', error)

    // Complete the log as failed
    if (logId) {
      await completeCronJobLog(logId, 'failed', {
        error: errorMessage,
      })
    }

    // Send failure notification
    await sendCronFailureEmail({
      jobName: 'deal-metrics-sync',
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
