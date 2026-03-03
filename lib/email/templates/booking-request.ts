import type { BookingFormData } from '@/components/RequestForm/types'
import { getAppBaseUrl } from '@/lib/config/env'
import { formatRequestNameDate, parseDateInPanamaTime } from '@/lib/date'
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

function getParentCategory(category?: string): string | undefined {
  if (!category) return undefined
  return category.split(/\s*[›>]\s*/)[0]?.trim() || undefined
}

function getBookingRecord(bookingData: BookingDataInput): Record<string, unknown> {
  if (!bookingData || typeof bookingData !== 'object') return {}
  return bookingData as Record<string, unknown>
}

function getEventDays(bookingData: BookingDataInput): string[] {
  const record = getBookingRecord(bookingData)
  const raw = record.eventDays
  if (!Array.isArray(raw)) return []
  return raw
    .filter((date): date is string => typeof date === 'string')
    .map((date) => date.trim())
    .filter((date) => date.length > 0)
}

function formatEventDays(eventDays: string[]): string {
  return eventDays
    .map((date) => {
      const parsedDate = parseDateInPanamaTime(date)
      return isNaN(parsedDate.getTime()) ? escapeHtml(date) : escapeHtml(formatRequestNameDate(parsedDate))
    })
    .join('<br/>')
}

function getCampaignDurationDisplay(bookingData: BookingDataInput): string {
  const record = getBookingRecord(bookingData)
  const rawDuration = record.campaignDuration
  if (rawDuration === null || rawDuration === undefined) return ''
  const duration = String(rawDuration).trim()
  if (!duration) return ''

  const durationNumber = Number.parseInt(duration, 10)
  const rawUnit = String(record.campaignDurationUnit || 'months').toLowerCase()
  const unit = rawUnit === 'days' ? 'days' : 'months'
  const unitLabel =
    unit === 'days'
      ? durationNumber === 1 ? 'día' : 'días'
      : durationNumber === 1 ? 'mes' : 'meses'
  return `${escapeHtml(duration)} ${unitLabel}`
}

/**
 * Generate HTML string for booking request email.
 *
 * One summary card → action buttons → PDF notice.
 * Full details live in the attached PDF.
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
    bookingData = null,
  } = props
  const parentCategory = getParentCategory(category) || 'General'
  const eventDays = getEventDays(bookingData)
  const formattedEventDays = eventDays.length > 0 ? formatEventDays(eventDays) : ''
  const campaignDurationDisplay = eventDays.length === 0 ? getCampaignDurationDisplay(bookingData) : ''

  const termsLink = tncUrl || `${getAppBaseUrl()}/t-c`

  const content = `
    <!-- Title -->
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em; text-align: center;">
      Solicitud de Aprobación
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Nueva propuesta para <strong>${escapeHtml(merchant || requestName)}</strong>
    </p>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td colspan="2" style="padding-bottom: 16px;">
            ${renderKeyValue('Evento / Campaña', escapeHtml(requestName), true)}
          </td>
        </tr>
        ${merchant ? `
        <tr>
          <td colspan="2" style="padding-bottom: 16px;">
            ${renderKeyValue('Merchant / Aliado', escapeHtml(merchant), true)}
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="width: 50%; vertical-align: top; padding-bottom: 16px;">
            ${renderKeyValue('Categoría', escapeHtml(parentCategory), true)}
          </td>
          <td style="width: 50%; vertical-align: top; padding-bottom: 16px;">
            ${renderKeyValue('Email del Negocio', escapeHtml(businessEmail), true)}
          </td>
        </tr>
        <tr>
          <td style="width: 50%; vertical-align: top;">
            ${renderKeyValue('Fecha de Inicio (Tentativa)', escapeHtml(startDate), true)}
          </td>
          <td style="width: 50%; vertical-align: top;">
            ${renderKeyValue('Fecha de Fin (Tentativa)', escapeHtml(endDate), true)}
          </td>
        </tr>
        ${formattedEventDays ? `
        <tr>
          <td colspan="2" style="padding-top: 12px;">
            ${renderKeyValue('Días del Evento', formattedEventDays, true)}
          </td>
        </tr>
        ` : ''}
        ${!formattedEventDays && campaignDurationDisplay ? `
        <tr>
          <td colspan="2" style="padding-top: 12px;">
            ${renderKeyValue('Duración de Campaña', campaignDurationDisplay, true)}
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    <!-- Action Buttons -->
    ${!hideActions ? `
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="margin-bottom: 12px;">
          ${renderButton('Aprobar', approveUrl, 'primary')}
          <span style="display: inline-block; width: 12px;"></span>
          ${renderButton('Rechazar', rejectUrl, 'danger')}
        </div>
        <div style="font-size: 11px; color: ${EMAIL_STYLES.colors.secondary};">
          Al aprobar, acepta los <a href="${termsLink}" style="color: ${EMAIL_STYLES.colors.secondary}; text-decoration: underline;">Términos y Condiciones</a>.
        </div>
      </div>
    ` : ''}

    ${renderDivider()}

    <!-- PDF Notice -->
    <div style="text-align: center; padding: 20px 0;">
      <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: ${EMAIL_STYLES.colors.text};">
        📎 Adjunto los detalles del acuerdo
      </p>
      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        Revise el PDF adjunto para consultar la información completa de la solicitud.
      </p>
    </div>

    <!-- Sent By -->
    <div style="margin-top: 16px; font-size: 11px; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Solicitud enviada por: ${escapeHtml(requesterEmail || 'Equipo de OfertaSimple')}
    </div>
  `

  return renderEmailLayout({
    title: 'Solicitud de Aprobación - OfertaSimple',
    previewText: `Nueva propuesta para ${merchant || requestName}`,
    children: content,
  })
}
