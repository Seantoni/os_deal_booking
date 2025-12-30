/**
 * Opportunity Mention Notification Email Service
 * 
 * Sends email notifications when users are mentioned in opportunity comments
 */

import { resend, EMAIL_CONFIG } from '../config'
import { renderMentionNotificationEmail } from '../templates/mention-notification'
import { logger } from '@/lib/logger'

interface SendOpportunityMentionNotificationEmailParams {
  to: string
  mentionedUserName: string
  authorName: string
  content: string
  opportunityId: string
  businessName: string
}

/**
 * Send mention notification email to a user for opportunity comments
 */
export async function sendOpportunityMentionNotificationEmail(
  params: SendOpportunityMentionNotificationEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    mentionedUserName,
    authorName,
    content,
    opportunityId,
    businessName,
  } = params

  try {
    const html = renderMentionNotificationEmail({
      mentionedUserName,
      authorName,
      content,
      entityType: 'opportunity',
      entityId: opportunityId,
      businessName,
    })

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `💬 ${authorName} te mencionó en una oportunidad - ${businessName}`,
      html,
    })

    if (result.error) {
      logger.error(`Failed to send opportunity mention notification to ${to}:`, result.error)
      return { success: false, error: result.error.message }
    }

    logger.info(`Opportunity mention notification sent to ${to} for opportunity ${opportunityId}`)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Error sending opportunity mention notification to ${to}:`, error)
    return { success: false, error: errorMessage }
  }
}

