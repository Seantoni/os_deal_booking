/**
 * Booking Comment Mention Email Template
 *
 * Notifies users when they are mentioned in booking request field comments.
 */

import {
  renderEmailLayout,
  renderButton,
  escapeHtml,
  EMAIL_STYLES,
} from './layout'

export interface BookingCommentMentionEmailProps {
  mentionedUserName: string
  authorName: string
  content: string
  requestName: string
  requestUrl: string
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function renderBookingCommentMentionEmail(props: BookingCommentMentionEmailProps): string {
  const {
    mentionedUserName,
    authorName,
    content,
    requestName,
    requestUrl,
  } = props

  const truncatedContent = truncate(content.trim(), 320)

  const emailContent = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 48px; height: 48px; background-color: #f5f5f7; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 24px;">💬</div>
      <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Tienes un comentario
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        Hola <strong>${escapeHtml(mentionedUserName)}</strong>, <strong>${escapeHtml(authorName)}</strong> te mencionó en una solicitud.
      </p>
    </div>

    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 18px; margin-bottom: 18px;">
      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.05em; margin-bottom: 4px;">
        Solicitud
      </div>
      <div style="font-size: 16px; font-weight: 600; color: ${EMAIL_STYLES.colors.text};">
        ${escapeHtml(requestName)}
      </div>
    </div>

    <div style="background-color: #ffffff; border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 12px; padding: 18px; margin-bottom: 28px;">
      <div style="font-size: 15px; line-height: 1.6; color: ${EMAIL_STYLES.colors.text};">
        "${escapeHtml(truncatedContent)}"
      </div>
    </div>

    <div style="text-align: center;">
      ${renderButton('Responder comentario', requestUrl, 'primary')}
    </div>
  `

  return renderEmailLayout({
    title: 'Tienes un comentario - OfertaSimple',
    previewText: `${authorName} te mencionó en una solicitud`,
    children: emailContent,
  })
}
