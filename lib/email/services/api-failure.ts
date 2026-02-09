/**
 * API Failure Email Service
 *
 * Sends notification emails when external API calls fail
 */

import { resend, EMAIL_CONFIG } from '../config'
import { renderApiFailureEmail, renderApiFailureEmailText } from '../templates/api-failure'
import { logger } from '@/lib/logger'
import { ENV } from '@/lib/config/env'

const ADMIN_EMAIL = 'jose.paez@ofertasimple.com'

interface SendApiFailureEmailParams {
  endpoint: string
  method: string
  errorMessage: string
  statusCode?: number
  requestBody?: Record<string, unknown>
  responseRaw?: string
  createdAt: Date
  durationMs?: number
  userId?: string
  triggeredBy?: string
}

/**
 * Send API failure notification email to admin
 */
export async function sendApiFailureEmail(
  params: SendApiFailureEmailParams
): Promise<{ success: boolean; error?: string }> {
  const appBaseUrl = ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const html = renderApiFailureEmail({
      ...params,
      appBaseUrl,
    })

    const text = renderApiFailureEmailText({
      ...params,
      appBaseUrl,
    })

    // Get endpoint name for subject
    const endpointName = params.endpoint.includes('/vendors')
      ? 'Vendor API'
      : params.endpoint.includes('/deals')
      ? 'Deal API'
      : 'External API'

    const { error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: ADMIN_EMAIL,
      subject: `[OS Deals] ⚠️ Error en ${endpointName}: ${params.method} ${params.statusCode || 'N/A'}`,
      html,
      text,
    })

    if (error) {
      logger.error('[ApiFailureEmail] Failed to send:', error)
      return { success: false, error: error.message }
    }

    logger.info(`[ApiFailureEmail] Sent notification for ${params.endpoint} to ${ADMIN_EMAIL}`)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[ApiFailureEmail] Error:', error)
    return { success: false, error: errorMessage }
  }
}
