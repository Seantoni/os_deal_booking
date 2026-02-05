import type { BookingFormData } from '@/components/RequestForm/types'
import { getAppBaseUrl } from '@/lib/config/env'
import { 
  renderEmailLayout, 
  renderKeyValue, 
  renderButton, 
  renderDivider, 
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

// Type for booking data that can come from form data or database record
type BookingDataInput = Partial<BookingFormData> | Record<string, unknown> | null

interface BookingRequestEmailProps {
  requestName: string
  businessEmail: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
  approveUrl: string
  rejectUrl: string
  requesterEmail?: string
  additionalInfo?: {
    templateDisplayName?: string
    fields?: Record<string, string>
  } | null
  tncUrl?: string
  bookingData?: BookingDataInput
  hideActions?: boolean
}

/**
 * Generate HTML string for booking request email.
 *
 * Kept intentionally simple — one summary card with the key info and
 * action buttons.  Full details live in the attached PDF.
 */
export function renderBookingRequestEmail(props: BookingRequestEmailProps): string {
  const {
    requestName,
    merchant,
    businessEmail,
    category,
    startDate,
    endDate,
    approveUrl,
    rejectUrl,
    requesterEmail,
    tncUrl,
    hideActions = false,
  } = props

  const termsLink = tncUrl || `${getAppBaseUrl()}/t-c`

  const content = `
    <!-- Header Title -->
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em; text-align: center;">
      Solicitud de Aprobación
    </h1>
    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Nueva propuesta para <strong>${escapeHtml(merchant || requestName)}</strong>.
    </p>

    <!-- Key Info Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
      ${renderKeyValue('Evento / Campaña', escapeHtml(requestName), true)}
      ${merchant ? renderKeyValue('Merchant / Aliado', escapeHtml(merchant), true) : ''}
      ${renderKeyValue('Email del Negocio', escapeHtml(businessEmail), true)}
      ${renderKeyValue('Categoría', escapeHtml(category || 'General'), true)}

      <div style="margin-top: 12px;">
        ${renderKeyValue('Fecha de Inicio', escapeHtml(startDate))}
        ${renderKeyValue('Fecha de Fin', escapeHtml(endDate))}
      </div>
    </div>

    <!-- Action Buttons -->
    ${!hideActions ? `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="margin-bottom: 16px;">
          ${renderButton('Aprobar', approveUrl, 'primary')}
          <span style="display: inline-block; width: 12px;"></span>
          ${renderButton('Rechazar', rejectUrl, 'danger')}
        </div>
        <div style="font-size: 12px; color: ${EMAIL_STYLES.colors.secondary};">
          Al aprobar, acepta los <a href="${termsLink}" style="color: ${EMAIL_STYLES.colors.secondary}; text-decoration: underline;">Términos y Condiciones</a>.
        </div>
      </div>
    ` : ''}

    ${renderDivider()}

    <!-- PDF Notice -->
    <div style="text-align: center; padding: 24px 0;">
      <div style="font-size: 28px; margin-bottom: 12px;">📎</div>
      <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: ${EMAIL_STYLES.colors.text};">
        Detalles completos en el PDF adjunto
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        Abra el archivo PDF adjunto a este correo para consultar toda la información de la solicitud, incluyendo datos del negocio, estructura de la oferta, políticas y más.
      </p>
    </div>

    ${!hideActions ? `
      ${renderDivider()}
      <div style="text-align: center; margin-top: 24px; margin-bottom: 16px;">
        <div style="margin-bottom: 16px;">
          ${renderButton('Aprobar', approveUrl, 'primary')}
          <span style="display: inline-block; width: 12px;"></span>
          ${renderButton('Rechazar', rejectUrl, 'danger')}
        </div>
        <div style="font-size: 12px; color: ${EMAIL_STYLES.colors.secondary};">
          Al aprobar, acepta los <a href="${termsLink}" style="color: ${EMAIL_STYLES.colors.secondary}; text-decoration: underline;">Términos y Condiciones</a>.
        </div>
      </div>
    ` : ''}

    <div style="margin-top: 32px; font-size: 12px; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Solicitud enviada por: ${escapeHtml(requesterEmail || 'Equipo de OfertaSimple')}
    </div>
  `

  return renderEmailLayout({
    title: 'Solicitud de Aprobación - OfertaSimple',
    previewText: `Nueva propuesta para ${merchant || requestName}`,
    children: content,
  })
}
