/**
 * Sales Meeting Reminder Email Template
 *
 * Reminder for sales users who have not registered meetings in the last 48 hours.
 */

import {
  renderEmailLayout,
  renderButton,
  renderKeyValue,
  escapeHtml,
  EMAIL_STYLES,
} from './layout'

interface SalesMeetingReminderEmailProps {
  userName: string
  dateLabel: string
  meetingsCount: number
  crmUrl: string
}

export function renderSalesMeetingReminderEmail(props: SalesMeetingReminderEmailProps): string {
  const { userName, dateLabel, meetingsCount, crmUrl } = props

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Recordatorio de Reuniones
      </h1>
      <p style="margin: 0; font-size: 16px; color: ${EMAIL_STYLES.colors.secondary};">
        ${escapeHtml(dateLabel)}
      </p>
    </div>

    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.text}; text-align: center;">
      Hola <strong>${escapeHtml(userName)}</strong>, al momento no vemos reuniones registradas en las últimas 48 horas en tu CRM.
    </p>

    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
      ${renderKeyValue('Reuniones registradas (últimas 48 horas)', String(meetingsCount), true)}
      ${renderKeyValue('Acción recomendada', 'Revisa tus oportunidades y agrega las reuniones realizadas antes de cerrar el día.', true)}
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      ${renderButton('Revisar CRM', crmUrl, 'primary')}
    </div>

    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Si ya registraste tus reuniones recientemente, puedes ignorar este mensaje.
    </p>
  `

  return renderEmailLayout({
    title: 'Recordatorio de Reuniones - OfertaSimple',
    previewText: 'No tienes reuniones registradas en las últimas 48 horas en el CRM',
    children: content,
  })
}
