import { 
  renderEmailLayout, 
  renderSectionTitle, 
  renderKeyValue, 
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

interface RejectionEmailProps {
  requestName: string
  merchant?: string
  rejectionReason: string
}

/**
 * Generate HTML string for rejection email
 * Optimized for cross-client compatibility (Outlook, Gmail, etc.)
 */
export function renderRejectionEmail(props: RejectionEmailProps): string {
  const { requestName, merchant, rejectionReason } = props

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background-color: ${EMAIL_STYLES.colors.error}; border-radius: 50%; color: #ffffff; font-size: 24px; line-height: 48px; font-weight: bold; margin-bottom: 16px;">!</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Solicitud Rechazada
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        La solicitud para <strong>${escapeHtml(requestName)}</strong> no ha sido aprobada.
      </p>
    </div>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px;">
      ${renderSectionTitle('Resumen de la Solicitud')}
      
      <div style="margin-top: 16px; margin-bottom: 24px;">
        ${renderKeyValue('Solicitud', escapeHtml(requestName), true)}
        ${merchant ? renderKeyValue('Merchant / Aliado', escapeHtml(merchant), true) : ''}
      </div>

      <!-- Rejection Reason -->
      <div style="padding: 20px; background-color: rgba(255, 59, 48, 0.05); border-radius: 8px; border-left: 3px solid ${EMAIL_STYLES.colors.error};">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: ${EMAIL_STYLES.colors.error}; letter-spacing: 0.5px;">
          Motivo del Rechazo
        </h3>
        <div style="font-size: 14px; color: ${EMAIL_STYLES.colors.text}; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(rejectionReason)}</div>
      </div>
      
      <div style="margin-top: 24px; font-size: 13px; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
        Si tiene preguntas, por favor contacte al equipo de aprobaciones.
      </div>
    </div>
  `

  return renderEmailLayout({
    title: 'Solicitud Rechazada - OfertaSimple',
    previewText: `Solicitud rechazada para ${requestName}`,
    children: content
  })
}
