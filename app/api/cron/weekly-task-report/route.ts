/**
 * Weekly Task Performance Report Cron Job
 *
 * Sends a weekly AI-assisted commercial performance report to admins.
 * Scheduled for Fridays at 8:00 AM Panama time (13:00 UTC).
 *
 * This endpoint is protected by the CRON_SECRET environment variable.
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sendWeeklyTaskPerformanceReport } from '@/lib/email'
import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs } from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { logger } from '@/lib/logger'
import { verifyCronSecret } from '@/lib/cron/verify-secret'
import { getUserRole } from '@/lib/auth/roles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const startTime = Date.now()

  if (!verifyCronSecret(request)) {
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthorized cron request attempted for weekly-task-report')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole()
    if (role !== 'admin') {
      logger.warn('Forbidden cron request attempted for weekly-task-report by non-admin user')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
  }

  logger.info('Starting weekly task performance report cron job')

  const logResult = await startCronJobLog('weekly-task-report', 'cron')
  const logId = logResult.logId

  try {
    const result = await sendWeeklyTaskPerformanceReport()
    const durationMs = Date.now() - startTime

    if (logId) {
      await completeCronJobLog(logId, result.success ? 'success' : 'failed', {
        message: `Weekly report: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
        details: {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          summary: result.summary,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      })
    }

    if (result.failed > 0) {
      await sendCronFailureEmail({
        jobName: 'weekly-task-report',
        errorMessage: `${result.failed} weekly report email(s) failed`,
        startedAt: new Date(startTime),
        durationMs,
        details: {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          errors: result.errors,
          summary: result.summary,
        },
      })
    }

    await cleanupOldCronJobLogs(30)

    logger.info(`Weekly task performance report cron completed in ${durationMs}ms`, {
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    })

    return NextResponse.json({
      success: result.success,
      message: `Weekly report processed: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
      duration: `${durationMs}ms`,
      details: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        summary: result.summary,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    logger.error('Weekly task performance report cron failed:', error)

    if (logId) {
      await completeCronJobLog(logId, 'failed', {
        error: errorMessage,
      })
    }

    await sendCronFailureEmail({
      jobName: 'weekly-task-report',
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
