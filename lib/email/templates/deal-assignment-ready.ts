import { 
  renderEmailLayout, 
  renderSectionTitle, 
  renderKeyValue, 
  renderButton,
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

interface DealAssignmentReadyEmailProps {
  requestName: string
  merchant?: string
  category?: string
  startDate?: string
  endDate?: string
  assignmentsUrl: string
}

/**
 * Generate HTML string for deal assignment notification email
 * Sent to senior editors when a deal is reserved and ready to be assigned
 */
export function renderDealAssignmentReadyEmail(props: DealAssignmentReadyEmailProps): string {
  const {
    requestName,
    merchant,
    category,
    startDate,
    endDate,
    assignmentsUrl,
  } = props

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background-color: ${EMAIL_STYLES.colors.brand}; border-radius: 50%; color: #ffffff; font-size: 22px; line-height: 48px; font-weight: bold; margin-bottom: 16px;">!</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Deal Listo para Asignar
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        Un deal fue reservado y necesita asignación de Editor y ERE.
      </p>
    </div>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px;">
      ${renderSectionTitle('Resumen del Deal')}
      
      <div style="margin-top: 16px;">
        ${renderKeyValue('Solicitud', escapeHtml(requestName), true)}
        ${merchant ? renderKeyValue('Merchant / Aliado', escapeHtml(merchant), true) : ''}
        ${category ? renderKeyValue('Categoría', escapeHtml(category), true) : ''}
        
        <div style="margin-top: 12px;">
          ${renderKeyValue('Fecha de Inicio', escapeHtml(startDate || 'Sin fecha'))}
          ${renderKeyValue('Fecha de Fin', escapeHtml(endDate || 'Sin fecha'))}
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin-top: 28px;">
      ${renderButton('Asignar ahora', assignmentsUrl, 'primary')}
    </div>
  `

  return renderEmailLayout({
    title: 'Deal Listo para Asignar - OfertaSimple',
    previewText: `Deal listo para asignar: ${requestName}`,
    children: content
  })
}
