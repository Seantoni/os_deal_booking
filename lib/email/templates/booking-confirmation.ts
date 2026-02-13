import { 
  renderEmailLayout, 
  renderSectionTitle, 
  renderKeyValue, 
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

interface BookingConfirmationEmailProps {
  eventName: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
}

function getParentCategory(category?: string): string | undefined {
  if (!category) return undefined
  return category.split(/\s*[›>]\s*/)[0]?.trim() || undefined
}

/**
 * Generate HTML string for booking confirmation email
 * Optimized for cross-client compatibility (Outlook, Gmail, etc.)
 */
export function renderBookingConfirmationEmail(data: BookingConfirmationEmailProps): string {
  const { eventName, merchant, category, startDate, endDate } = data
  const parentCategory = getParentCategory(category)

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background-color: ${EMAIL_STYLES.colors.success}; border-radius: 50%; color: #ffffff; font-size: 24px; line-height: 48px; font-weight: bold; margin-bottom: 16px;">✓</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Reserva Confirmada
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        La reserva para <strong>${escapeHtml(eventName)}</strong> está lista.
      </p>
    </div>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px;">
      ${renderSectionTitle('Resumen de la Reserva')}
      
      <div style="margin-top: 16px;">
        ${renderKeyValue('Evento / Campaña', escapeHtml(eventName), true)}
        ${merchant ? renderKeyValue('Merchant / Aliado', escapeHtml(merchant), true) : ''}
        ${parentCategory ? renderKeyValue('Categoría', escapeHtml(parentCategory), true) : ''}
        
        <div style="margin-top: 12px;">
          ${renderKeyValue('Fecha de Inicio', escapeHtml(startDate))}
          ${renderKeyValue('Fecha de Fin', escapeHtml(endDate))}
        </div>
      </div>

      <!-- Status Badge -->
      <div style="margin-top: 24px; text-align: center;">
        <span style="display: inline-block; padding: 6px 16px; background-color: rgba(52, 199, 89, 0.1); color: ${EMAIL_STYLES.colors.success}; font-size: 13px; font-weight: 600; border-radius: 99px;">
          Lista para ser publicada
        </span>
      </div>
    </div>
  `

  return renderEmailLayout({
    title: 'Reserva Confirmada - OfertaSimple',
    previewText: `Reserva confirmada para ${eventName}`,
    children: content
  })
}
