/**
 * Booking Comment Mention Notification Email Service
 *
 * Sends email notifications when users are mentioned in booking request comments.
 */

import { resend, EMAIL_CONFIG } from '../config'
import { renderBookingCommentMentionEmail } from '../templates/booking-comment-mention'
import { getAppBaseUrl } from '@/lib/config/env'
import { logger } from '@/lib/logger'

interface SendBookingCommentMentionNotificationEmailParams {
  to: string
  mentionedUserName: string
  authorName: string
  content: string
  requestId: string
  requestName: string
  commentId: string
}

/**
 * Send mention notification email to a user for booking request comments.
 */
export async function sendBookingCommentMentionNotificationEmail(
  params: SendBookingCommentMentionNotificationEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    mentionedUserName,
    authorName,
    content,
    requestId,
    requestName,
    commentId,
  } = params

  try {
    const appBaseUrl = getAppBaseUrl()
    const requestUrl = `${appBaseUrl}/deals?request=${encodeURIComponent(requestId)}&comment=${encodeURIComponent(commentId)}`

    const html = renderBookingCommentMentionEmail({
      mentionedUserName,
      authorName,
      content,
      requestName,
      requestUrl,
    })

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `💬 Tienes un comentario nuevo - ${requestName}`,
      html,
    })

    if (result.error) {
      logger.error(`Failed to send booking mention notification to ${to}:`, result.error)
      return { success: false, error: result.error.message }
    }

    logger.info(`Booking mention notification sent to ${to} for request ${requestId}`)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Error sending booking mention notification to ${to}:`, error)
    return { success: false, error: errorMessage }
  }
}
