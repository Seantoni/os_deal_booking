/**
 * Restaurant Leads Sync Cron Job
 *
 * Daily sync of restaurant leads from Degusta Panama.
 * Scheduled to run at 8:00 AM UTC (3:00 AM Panama time).
 *
 * Now uses Degusta's internal search API directly (no headless browser).
 *
 * This endpoint is protected by the CRON_SECRET environment variable.
 * Vercel Cron Jobs will automatically include this secret in the Authorization header.
 */

import { NextResponse } from 'next/server'
import { runFullRestaurantScan } from '@/lib/scraping'
import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs } from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { logger } from '@/lib/logger'
import { verifyCronSecret } from '@/lib/cron/verify-secret'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const startTime = Date.now()

  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempted for restaurant-leads-sync')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  logger.info('Starting restaurant-leads-sync cron job')

  const logResult = await startCronJobLog('restaurant-leads-sync', 'cron')
  const logId = logResult.logId

  try {
    const result = await runFullRestaurantScan(
      (progress) => {
        logger.info(`[${progress.site}] ${progress.phase}: ${progress.message}`)
      },
      150
    )

    const durationMs = Date.now() - startTime

    const stats = {
      restaurantsFound: result.restaurantsFound,
      newRestaurants: result.newRestaurants,
      updatedRestaurants: result.updatedRestaurants,
      errors: result.errors.length,
    }

    if (logId) {
      await completeCronJobLog(logId, result.success ? 'success' : 'failed', {
        message: `Scanned ${result.restaurantsFound} restaurants (${result.newRestaurants} new, ${result.updatedRestaurants} updated)`,
        details: stats,
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      })
    }

    if (!result.success) {
      await sendCronFailureEmail({
        jobName: 'restaurant-leads-sync',
        errorMessage: result.errors.join('; ') || 'Unknown error during restaurant scraping',
        startedAt: new Date(startTime),
        durationMs,
        details: stats,
      })
    }

    await cleanupOldCronJobLogs(30)

    logger.info(`Restaurant-leads-sync cron job completed in ${durationMs}ms`, {
      success: result.success,
      stats,
    })

    return NextResponse.json({
      success: result.success,
      message: `Scanned ${result.restaurantsFound} restaurants (${result.newRestaurants} new, ${result.updatedRestaurants} updated)`,
      duration: `${durationMs}ms`,
      stats,
      errors: result.errors.length > 0 ? result.errors : undefined,
      logId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    logger.error('Restaurant-leads-sync cron job failed:', error)

    if (logId) {
      await completeCronJobLog(logId, 'failed', {
        error: errorMessage,
      })
    }

    await sendCronFailureEmail({
      jobName: 'restaurant-leads-sync',
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

export async function POST(request: Request) {
  return GET(request)
}
