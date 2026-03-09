import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  cleanupOldCronJobLogs,
  completeCronJobLog,
  startCronJobLog,
} from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { sendVendorReactivationEmail } from '@/lib/email/services/vendor-reactivation'
import { getUserRole } from '@/lib/auth/roles'
import {
  getVendorReactivationTargets,
  markVendorReactivationEmailSent,
} from '@/lib/vendor-reactivation/service'
import { verifyCronSecret } from '@/lib/cron/verify-secret'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const startTime = Date.now()

  const standardCronAuthorized = process.env.CRON_SECRET
    ? verifyCronSecret(request)
    : false
  const reactivationCronAuthorized = process.env.CRON_SECRET_REACTIVATION
    ? verifyCronSecret(request, 'CRON_SECRET_REACTIVATION')
    : false

  if (!standardCronAuthorized && !reactivationCronAuthorized) {
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthorized cron request attempted for vendor-reactivation-scan')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole()
    if (role !== 'admin') {
      logger.warn('Forbidden cron request attempted for vendor-reactivation-scan by non-admin user')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
  }

  const logResult = await startCronJobLog('vendor-reactivation-scan', 'cron')
  const logId = logResult.logId

  try {
    const targets = await getVendorReactivationTargets()
    let sentCount = 0
    let failedCount = 0

    for (const target of targets) {
      try {
        await sendVendorReactivationEmail({
          businessId: target.businessId,
          businessName: target.businessName,
          recipientEmail: target.contactEmail,
          eligibleDeals: target.eligibleDeals,
        })
        await markVendorReactivationEmailSent(target.businessId)
        sentCount += 1
      } catch (sendError) {
        failedCount += 1
        logger.error('[vendor-reactivation-scan] Failed sending email', {
          businessId: target.businessId,
          error: sendError instanceof Error ? sendError.message : String(sendError),
        })
      }
    }

    if (logId) {
      await completeCronJobLog(logId, failedCount > 0 ? 'failed' : 'success', {
        message: `Evaluated ${targets.length} vendors`,
        details: {
          targets: targets.length,
          sentCount,
          failedCount,
        },
        error: failedCount > 0 ? `${failedCount} vendor reactivation email(s) failed` : undefined,
      })
    }

    await cleanupOldCronJobLogs(30)

    return NextResponse.json({
      success: failedCount === 0,
      targets: targets.length,
      sentCount,
      failedCount,
      durationMs: Date.now() - startTime,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    if (logId) {
      await completeCronJobLog(logId, 'failed', {
        error: errorMessage,
      })
    }

    await sendCronFailureEmail({
      jobName: 'vendor-reactivation-scan',
      errorMessage,
      startedAt: new Date(startTime),
      durationMs,
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        durationMs,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
