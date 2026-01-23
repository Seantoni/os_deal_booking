/**
 * Cron Failure Email Service
 * 
 * Sends notification emails when cron jobs fail
 */

import { resend, EMAIL_CONFIG } from '../config'
import { renderCronFailureEmail, renderCronFailureEmailText } from '../templates/cron-failure'
import { logger } from '@/lib/logger'
import { ENV } from '@/lib/config/env'

const ADMIN_EMAIL = 'jose.paez@ofertasimple.com'

interface SendCronFailureEmailParams {
  jobName: string
  errorMessage: string
  startedAt: Date
  durationMs?: number
  details?: Record<string, unknown>
}

/**
 * Send cron failure notification email to admin
 */
export async function sendCronFailureEmail(
  params: SendCronFailureEmailParams
): Promise<{ success: boolean; error?: string }> {
  const appBaseUrl = ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const html = renderCronFailureEmail({
      ...params,
      appBaseUrl,
    })

    const text = renderCronFailureEmailText({
      ...params,
      appBaseUrl,
    })

    const { error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: ADMIN_EMAIL,
      subject: `[OS Deals] ⚠️ Cron Job Failed: ${params.jobName}`,
      html,
      text,
    })

    if (error) {
      logger.error('[CronFailureEmail] Failed to send:', error)
      return { success: false, error: error.message }
    }

    logger.info(`[CronFailureEmail] Sent notification for ${params.jobName} to ${ADMIN_EMAIL}`)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[CronFailureEmail] Error:', error)
    return { success: false, error: errorMessage }
  }
}
