import { 
  renderEmailLayout, 
  renderSectionTitle, 
  renderKeyValue, 
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

interface CancelledEmailProps {
  requestName: string
  merchant?: string
  cancelledBy?: string
}

/**
 * Generate HTML string for cancellation email
 * Optimized for cross-client compatibility (Outlook, Gmail, etc.)
 */
export function renderCancelledEmail(props: CancelledEmailProps): string {
  const { requestName, merchant, cancelledBy } = props

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background-color: ${EMAIL_STYLES.colors.warning}; border-radius: 50%; color: #ffffff; font-size: 24px; line-height: 48px; font-weight: bold; margin-bottom: 16px;">!</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Solicitud Cancelada
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        La solicitud para <strong>${escapeHtml(requestName)}</strong> ha sido cancelada.
      </p>
    </div>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px;">
      ${renderSectionTitle('Resumen de la Solicitud')}
      
      <div style="margin-top: 16px; margin-bottom: 24px;">
        ${renderKeyValue('Solicitud', escapeHtml(requestName), true)}
        ${merchant ? renderKeyValue('Merchant / Aliado', escapeHtml(merchant), true) : ''}
        ${cancelledBy ? renderKeyValue('Cancelada por', escapeHtml(cancelledBy), true) : ''}
      </div>

      <div style="padding: 16px; background-color: rgba(255, 149, 0, 0.1); border-radius: 8px; color: ${EMAIL_STYLES.colors.warning}; font-size: 14px; line-height: 1.5;">
        Esta solicitud ha sido cancelada antes de ser procesada.
      </div>
    </div>

    <!-- Help -->
    <div style="margin-top: 32px; text-align: center;">
      <p style="font-size: 14px; color: ${EMAIL_STYLES.colors.secondary}; margin-bottom: 12px;">
        ¿Necesitas ayuda o deseas enviar una nueva solicitud?
      </p>
      <a href="mailto:soporte@ofertasimple.com" style="color: ${EMAIL_STYLES.colors.accent}; font-weight: 500; font-size: 14px;">Contactar Soporte &rarr;</a>
    </div>
  `

  return renderEmailLayout({
    title: 'Solicitud Cancelada - OfertaSimple',
    previewText: `Solicitud cancelada para ${requestName}`,
    children: content
  })
}
