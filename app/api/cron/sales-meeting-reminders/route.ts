/**
 * Sales Meeting Reminders Cron Job
 *
 * Sends daily reminder emails at 4:00 PM Panama time (21:00 UTC)
 * to active sales users that have not registered meetings for today.
 *
 * This endpoint is protected by the CRON_SECRET environment variable.
 */

import { NextResponse } from 'next/server'
import { sendSalesMeetingReminders } from '@/lib/email'
import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs } from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

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

  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempted for sales-meeting-reminders')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Starting sales-meeting-reminders cron job')

  const logResult = await startCronJobLog('sales-meeting-reminders', 'cron')
  const logId = logResult.logId

  try {
    const result = await sendSalesMeetingReminders()
    const durationMs = Date.now() - startTime

    if (logId) {
      await completeCronJobLog(logId, result.success ? 'success' : 'failed', {
        message: `Sales meeting reminders: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
        details: {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          usersEvaluated: result.usersEvaluated,
          usersWithMeetings: result.usersWithMeetings,
          usersWithoutMeetings: result.usersWithoutMeetings,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      })
    }

    if (result.failed > 0) {
      await sendCronFailureEmail({
        jobName: 'sales-meeting-reminders',
        errorMessage: `${result.failed} emails failed to send`,
        startedAt: new Date(startTime),
        durationMs,
        details: {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          usersEvaluated: result.usersEvaluated,
          usersWithMeetings: result.usersWithMeetings,
          usersWithoutMeetings: result.usersWithoutMeetings,
          errors: result.errors,
        },
      })
    }

    await cleanupOldCronJobLogs(30)

    logger.info(`Sales meeting reminders cron job completed in ${durationMs}ms`, {
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      usersEvaluated: result.usersEvaluated,
      usersWithoutMeetings: result.usersWithoutMeetings,
    })

    return NextResponse.json({
      success: result.success,
      message: `Sales meeting reminders processed: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
      duration: `${durationMs}ms`,
      details: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        usersEvaluated: result.usersEvaluated,
        usersWithMeetings: result.usersWithMeetings,
        usersWithoutMeetings: result.usersWithoutMeetings,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    logger.error('Sales meeting reminders cron job failed:', error)

    if (logId) {
      await completeCronJobLog(logId, 'failed', {
        error: errorMessage,
      })
    }

    await sendCronFailureEmail({
      jobName: 'sales-meeting-reminders',
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
