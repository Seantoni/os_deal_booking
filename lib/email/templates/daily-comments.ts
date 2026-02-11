/**
 * Daily Comments Summary Email Template
 *
 * Daily summary of comments received across categories.
 */

import { formatSpanishFullDate, formatShortDateWithWeekday } from '@/lib/date'
import {
  renderEmailLayout,
  renderSectionTitle,
  renderButton,
  escapeHtml,
  EMAIL_STYLES,
} from './layout'

export interface DailyCommentItem {
  id: string
  authorName: string
  content: string
  createdAt: Date
  entityName: string
  linkUrl: string
}

export interface DailyCommentsEmailProps {
  userName: string
  opportunities: DailyCommentItem[]
  marketing: DailyCommentItem[]
  requests: DailyCommentItem[]
  appBaseUrl: string
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function renderCommentRow(item: DailyCommentItem): string {
  const dateLabel = formatShortDateWithWeekday(item.createdAt)

  return `
    <div style="padding: 14px 0; border-bottom: 1px solid ${EMAIL_STYLES.colors.border};">
      <div style="font-size: 12px; color: ${EMAIL_STYLES.colors.secondary}; margin-bottom: 6px;">
        ${escapeHtml(item.authorName)} • ${escapeHtml(dateLabel)}
      </div>
      <div style="font-size: 15px; font-weight: 600; color: ${EMAIL_STYLES.colors.text}; margin-bottom: 4px;">
        ${escapeHtml(item.entityName)}
      </div>
      <div style="font-size: 13px; color: ${EMAIL_STYLES.colors.secondary}; margin-bottom: 8px;">
        "${escapeHtml(truncate(item.content, 140))}"
      </div>
      <div>
        <a href="${item.linkUrl}" style="font-size: 13px; font-weight: 500; color: ${EMAIL_STYLES.colors.accent}; text-decoration: none;">
          Ver detalle &rarr;
        </a>
      </div>
    </div>
  `
}

function renderCommentsSection(title: string, items: DailyCommentItem[]): string {
  if (items.length === 0) return ''

  return `
    <div style="margin-bottom: 32px;">
      ${renderSectionTitle(`${title} (${items.length})`)}
      <div>
        ${items.map(renderCommentRow).join('')}
      </div>
    </div>
  `
}

export function renderDailyCommentsEmail(props: DailyCommentsEmailProps): string {
  const { userName, opportunities, marketing, requests, appBaseUrl } = props
  const totalCount = opportunities.length + marketing.length + requests.length
  const todayFormatted = formatSpanishFullDate(new Date())
  const inboxUrl = `${appBaseUrl}/dashboard`

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Resumen Diario de Comentarios
      </h1>
      <p style="margin: 0; font-size: 16px; color: ${EMAIL_STYLES.colors.secondary};">
        ${todayFormatted}
      </p>
    </div>

    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.text}; text-align: center;">
      Hola <strong>${escapeHtml(userName)}</strong>, recibiste <strong>${totalCount} comentario${totalCount !== 1 ? 's' : ''}</strong> en las últimas 24 horas.
    </p>

    ${renderCommentsSection('Oportunidades', opportunities)}
    ${renderCommentsSection('Mercadeo', marketing)}
    ${renderCommentsSection('Solicitudes', requests)}

    <div style="text-align: center; margin-top: 32px;">
      ${renderButton('Ver Inbox', inboxUrl, 'primary')}
    </div>
  `

  return renderEmailLayout({
    title: 'Resumen Diario de Comentarios - OfertaSimple',
    previewText: `Tienes ${totalCount} comentario${totalCount !== 1 ? 's' : ''} nuevos`,
    children: content,
  })
}
