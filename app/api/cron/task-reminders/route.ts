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
import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs } from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
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
  const startTime = Date.now()

  // Verify the request is from Vercel Cron
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempted for task-reminders')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  logger.info('Starting task reminder cron job')

  // Start cron job log
  const logResult = await startCronJobLog('task-reminders', 'cron')
  const logId = logResult.logId

  try {
    const result = await sendAllTaskReminders()
    const durationMs = Date.now() - startTime

    // Complete the log
    if (logId) {
      await completeCronJobLog(logId, result.success ? 'success' : 'failed', {
        message: `Task reminders: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
        details: {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      })
    }

    // If there were failures, send notification
    if (result.failed > 0) {
      await sendCronFailureEmail({
        jobName: 'task-reminders',
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

    // Cleanup old logs
    await cleanupOldCronJobLogs(30)

    logger.info(`Task reminder cron job completed in ${durationMs}ms`, {
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    })

    return NextResponse.json({
      success: result.success,
      message: `Task reminders processed: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
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

    logger.error('Task reminder cron job failed:', error)

    // Complete the log as failed
    if (logId) {
      await completeCronJobLog(logId, 'failed', {
        error: errorMessage,
      })
    }

    // Send failure notification
    await sendCronFailureEmail({
      jobName: 'task-reminders',
      errorMessage,
      startedAt: new Date(startTime),
      durationMs,
    })

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

