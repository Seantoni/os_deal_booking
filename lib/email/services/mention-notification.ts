/**
 * Mention Notification Email Service
 * 
 * Sends email notifications when users are mentioned in marketing option comments
 */

import { resend, EMAIL_CONFIG } from '../config'
import { renderMentionNotificationEmail } from '../templates/mention-notification'
import { logger } from '@/lib/logger'

interface SendMentionNotificationEmailParams {
  to: string
  mentionedUserName: string
  authorName: string
  content: string
  optionType: string
  platform: string
  businessName: string
  campaignId: string
}

/**
 * Send mention notification email to a user (for marketing comments)
 */
export async function sendMentionNotificationEmail(
  params: SendMentionNotificationEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    mentionedUserName,
    authorName,
    content,
    optionType,
    platform,
    businessName,
    campaignId,
  } = params

  try {
    const html = renderMentionNotificationEmail({
      mentionedUserName,
      authorName,
      content,
      entityType: 'marketing',
      entityId: campaignId,
      businessName,
      optionType,
      platform,
    })

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `💬 ${authorName} te mencionó en un comentario - ${businessName}`,
      html,
    })

    if (result.error) {
      logger.error(`Failed to send mention notification to ${to}:`, result.error)
      return { success: false, error: result.error.message }
    }

    logger.info(`Mention notification sent to ${to} for campaign ${campaignId}`)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Error sending mention notification to ${to}:`, error)
    return { success: false, error: errorMessage }
  }
}

