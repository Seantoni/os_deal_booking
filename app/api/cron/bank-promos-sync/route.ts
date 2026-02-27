/**
 * Bank Promos Sync Cron Job
 *
 * Sync of Banco General promociones. Runs Mon & Fri at 7:00 AM Panama (12:00 UTC).
 * Uses fast mode (skipConditions) to stay within Vercel limits.
 *
 * Protected by CRON_SECRET. Vercel Cron sends it in the Authorization header.
 */

import { NextResponse } from 'next/server'
import { scrapeBGeneral } from '@/lib/scraping'
import { upsertBankPromosFromScan } from '@/app/actions/bank-promos'
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
    logger.warn('Unauthorized cron request attempted for bank-promos-sync')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Starting bank-promos-sync cron job')

  const logResult = await startCronJobLog('bank-promos-sync', 'cron')
  const logId = logResult.logId

  try {
    const result = await scrapeBGeneral(100, undefined, { skipConditions: true })
    const saveResult = await upsertBankPromosFromScan(result.promos)

    const durationMs = Date.now() - startTime

    const stats = {
      promosFound: result.promos.length,
      created: saveResult.created,
      updated: saveResult.updated,
      errors: result.errors.length,
    }

    if (logId) {
      await completeCronJobLog(logId, result.success ? 'success' : 'failed', {
        message: `Scanned ${result.promos.length} promos (${saveResult.created} new, ${saveResult.updated} updated)`,
        details: stats,
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      })
    }

    if (!result.success) {
      await sendCronFailureEmail({
        jobName: 'bank-promos-sync',
        errorMessage: result.errors.join('; ') || 'Unknown error during bank promos scan',
        startedAt: new Date(startTime),
        durationMs,
        details: stats,
      })
    }

    await cleanupOldCronJobLogs(30)

    logger.info(`Bank-promos-sync cron job completed in ${durationMs}ms`, {
      success: result.success,
      stats,
    })

    return NextResponse.json({
      success: result.success,
      message: `Scanned ${result.promos.length} promos (${saveResult.created} new, ${saveResult.updated} updated)`,
      duration: `${durationMs}ms`,
      stats,
      errors: result.errors.length > 0 ? result.errors : undefined,
      logId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    logger.error('Bank-promos-sync cron job failed:', error)

    if (logId) {
      await completeCronJobLog(logId, 'failed', { error: errorMessage })
    }

    await sendCronFailureEmail({
      jobName: 'bank-promos-sync',
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
