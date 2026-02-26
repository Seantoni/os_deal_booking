/**
 * Daily Comment Summaries Cron Job
 *
 * Sends daily comment summary emails to users.
 * Scheduled to run at 8:00 AM Panama time (13:00 UTC) on weekdays.
 *
 * This endpoint is protected by the CRON_SECRET environment variable.
 */

import { NextResponse } from 'next/server'
import { sendDailyCommentsSummary } from '@/lib/email'
import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs } from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { logger } from '@/lib/logger'
import { verifyCronSecret } from '@/lib/cron/verify-secret'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const startTime = Date.now()

  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempted for daily-comment-summaries')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Starting daily comment summaries cron job')

  const logResult = await startCronJobLog('daily-comment-summaries', 'cron')
  const logId = logResult.logId

  try {
    const result = await sendDailyCommentsSummary()
    const durationMs = Date.now() - startTime

    if (logId) {
      await completeCronJobLog(logId, result.success ? 'success' : 'failed', {
        message: `Daily comments: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
        details: {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      })
    }

    if (result.failed > 0) {
      await sendCronFailureEmail({
        jobName: 'daily-comment-summaries',
        errorMessage: `${result.failed} emails failed to send`,
        startedAt: new Date(startTime),
        durationMs,
        details: {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          errors: result.errors,
        },
      })
    }

    await cleanupOldCronJobLogs(30)

    logger.info(`Daily comment summaries cron job completed in ${durationMs}ms`, {
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    })

    return NextResponse.json({
      success: result.success,
      message: `Daily comments processed: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
      duration: `${durationMs}ms`,
      details: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    logger.error('Daily comment summaries cron job failed:', error)

    if (logId) {
      await completeCronJobLog(logId, 'failed', {
        error: errorMessage,
      })
    }

    await sendCronFailureEmail({
      jobName: 'daily-comment-summaries',
      errorMessage,
      startedAt: new Date(startTime),
      durationMs,
    })

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
