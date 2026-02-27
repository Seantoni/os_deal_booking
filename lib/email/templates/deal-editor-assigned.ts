import {
  renderEmailLayout,
  renderSectionTitle,
  renderKeyValue,
  renderButton,
  escapeHtml,
  EMAIL_STYLES,
} from './layout'

interface DealEditorAssignedEmailProps {
  editorName?: string
  requestName: string
  merchant?: string
  category?: string
  startDate?: string
  endDate?: string
  dealUrl: string
}

/**
 * Generate HTML string for notifying an editor about a newly assigned deal.
 */
export function renderDealEditorAssignedEmail(props: DealEditorAssignedEmailProps): string {
  const {
    editorName,
    requestName,
    merchant,
    category,
    startDate,
    endDate,
    dealUrl,
  } = props

  const greetingName = editorName?.trim() ? editorName : 'equipo editorial'

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background-color: ${EMAIL_STYLES.colors.brand}; border-radius: 50%; color: #ffffff; font-size: 22px; line-height: 48px; font-weight: bold; margin-bottom: 16px;">✓</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Nueva oferta asignada
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        Hola <strong>${escapeHtml(greetingName)}</strong>, se te asignó una nueva oferta para gestionar.
      </p>
    </div>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px;">
      ${renderSectionTitle('Detalle de la Oferta')}

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
      ${renderButton('Abrir oferta', dealUrl, 'primary')}
    </div>
  `

  return renderEmailLayout({
    title: 'Nueva Oferta Asignada - OfertaSimple',
    previewText: `Tienes una nueva oferta asignada: ${requestName}`,
    children: content,
  })
}
