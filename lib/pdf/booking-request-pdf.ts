/**
 * Booking Request PDF Generation
 *
 * Generates a professional, contract-style PDF summary of booking request data.
 * Designed for email attachments — Apple-inspired, clean, print-optimized.
 */

import type { BookingFormData } from '@/components/RequestForm/types'
import { generatePDFFromHTML } from './generate-pdf'
import { buildCategoryDisplayString } from '@/lib/utils/category-display'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { formatRequestNameDate, parseDateInPanamaTime } from '@/lib/date'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BookingRequestPDFOptions {
  requestName: string
  businessEmail: string
  merchant?: string
  category?: string
  parentCategory?: string
  subCategory1?: string
  subCategory2?: string
  startDate: Date
  endDate: Date
  requesterEmail?: string
  additionalInfo?: {
    templateDisplayName?: string
    fields?: Record<string, string>
  } | null
  bookingData: Partial<BookingFormData> | Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const esc = (v: string | undefined | null): string => {
  if (!v) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const PRISMA_JSON_NULL_SENTINELS = new Set([
  'Prisma.JsonNull',
  'Prisma.DbNull',
  'Prisma.AnyNull',
])

const isPrismaJsonNullSentinel = (v: unknown): boolean => {
  if (!v || typeof v !== 'object') return false
  return PRISMA_JSON_NULL_SENTINELS.has(String(v))
}

const isRenderableValue = (v: unknown): boolean => {
  if (v === null || v === undefined) return false
  if (isPrismaJsonNullSentinel(v)) return false
  if (Array.isArray(v)) {
    return v.some((item) => {
      if (item === null || item === undefined) return false
      if (isPrismaJsonNullSentinel(item)) return false
      return String(item).trim() !== ''
    })
  }
  return String(v).trim() !== ''
}

const fmt = (v: unknown): string => {
  if (Array.isArray(v)) {
    return v
      .filter((item) => item !== null && item !== undefined && !isPrismaJsonNullSentinel(item))
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0)
      .join(', ')
  }
  if (v === null || v === undefined || isPrismaJsonNullSentinel(v)) return ''
  return typeof v === 'string' ? v : String(v)
}

const LONG_TEXT_KEYS = new Set([
  'aboutOffer', 'goodToKnow', 'howToUseEs', 'whatWeLike',
  'businessReview', 'paymentInstructions', 'cancellationPolicy',
  'additionalComments', 'addressAndHours',
])

/**
 * Format long text content into structured HTML with proper bullets and sections.
 * Detects lines starting with - or • as bullet items, ALL-CAPS lines as section
 * headings, and preserves paragraph breaks.
 */
function formatRichText(raw: string): string {
  if (!raw) return ''
  const lines = raw.split('\n').map(l => l.trimEnd())

  let html = ''
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inList) { html += '</ul>'; inList = false }
      continue
    }

    const isBullet = /^[-–•]\s+/.test(trimmed)
    const isHeading = /^[A-ZÁÉÍÓÚÑ\s/()]{4,}$/.test(trimmed) && !isBullet

    if (isHeading) {
      if (inList) { html += '</ul>'; inList = false }
      html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6e6e73;margin:10px 0 4px 0;">${esc(trimmed)}</div>`
    } else if (isBullet) {
      const text = trimmed.replace(/^[-–•]\s+/, '')
      if (!inList) { html += '<ul style="margin:4px 0 4px 16px;padding:0;list-style:disc;">'; inList = true }
      html += `<li style="margin-bottom:3px;padding-left:2px;">${esc(text)}</li>`
    } else {
      if (inList) { html += '</ul>'; inList = false }
      html += `<div style="margin-bottom:4px;">${esc(trimmed)}</div>`
    }
  }
  if (inList) html += '</ul>'
  return html
}

function getEventDaysFromRecord(record: Record<string, unknown>): string[] {
  const raw = record.eventDays
  if (!Array.isArray(raw)) return []
  return raw
    .filter((date): date is string => typeof date === 'string')
    .map((date) => date.trim())
    .filter((date) => date.length > 0)
}

function getAdditionalBankAccountsFromRecord(record: Record<string, unknown>): string[] {
  const raw = record.additionalBankAccounts
  if (!Array.isArray(raw)) return []

  return raw
    .filter((account): account is Record<string, unknown> => !!account && typeof account === 'object' && !Array.isArray(account))
    .map((account, index) => {
      const bankAccountName = String(account.bankAccountName || '').trim()
      const bank = String(account.bank || '').trim()
      const accountNumber = String(account.accountNumber || '').trim()
      const accountType = String(account.accountType || '').trim()
      const details = [
        bankAccountName ? `Titular: ${bankAccountName}` : null,
        bank ? `Banco: ${bank}` : null,
        accountNumber ? `Cuenta: ${accountNumber}` : null,
        accountType ? `Tipo: ${accountType}` : null,
      ].filter(Boolean)

      if (details.length === 0) return null
      return `Cuenta ${index + 1}: ${details.join(' | ')}`
    })
    .filter((line): line is string => !!line)
}

function formatEventDayLabel(date: string): string {
  const parsed = parseDateInPanamaTime(date)
  if (isNaN(parsed.getTime())) return date
  return formatRequestNameDate(parsed)
}

function formatDatePanama(date: Date): string {
  return new Date(date).toLocaleDateString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Section definitions — maps form keys → human labels grouped by section
// ---------------------------------------------------------------------------

interface FieldDef {
  key: string
  label: string
  wide?: boolean
}

interface SectionDef {
  title: string
  fields: FieldDef[]
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Datos del Negocio y Responsables',
    fields: [
      { key: 'businessName', label: 'Nombre del Negocio' },
      { key: 'legalName', label: 'Razón Social' },
      { key: 'approverName', label: 'Nombre Aprobador' },
      { key: 'approverEmail', label: 'Email Aprobador' },
      { key: 'approverBusinessName', label: 'Empresa Aprobadora' },
      { key: 'redemptionContactName', label: 'Contacto Canje' },
      { key: 'redemptionContactEmail', label: 'Email Contacto Canje' },
      { key: 'redemptionContactPhone', label: 'Teléfono Contacto Canje' },
      { key: 'addressAndHours', label: 'Dirección y Horario', wide: true },
      { key: 'provinceDistrictCorregimiento', label: 'Ubicación' },
    ],
  },
  {
    title: 'Datos Bancarios y Fiscales',
    fields: [
      { key: 'rucDv', label: 'RUC / DV' },
      { key: 'bank', label: 'Banco' },
      { key: 'bankAccountName', label: 'Nombre Cuenta' },
      { key: 'accountNumber', label: 'Número Cuenta' },
      { key: 'accountType', label: 'Tipo Cuenta' },
      { key: 'additionalBankAccounts', label: 'Cuentas Bancarias Adicionales', wide: true },
    ],
  },
  {
    title: 'Operatividad y Pagos',
    fields: [
      { key: 'redemptionMode', label: 'Modalidad Canje' },
      { key: 'redemptionMethods', label: 'Métodos de Canje', wide: true },
      { key: 'isRecurring', label: 'Es Recurrente' },
      { key: 'recurringOfferLink', label: 'Link Oferta Recurrente', wide: true },
      { key: 'paymentType', label: 'Tipo Pago' },
      { key: 'paymentInstructions', label: 'Instrucciones Pago', wide: true },
    ],
  },
  {
    title: 'Reglas de Negocio',
    fields: [
      { key: 'includesTaxes', label: 'Incluye Impuestos' },
      { key: 'validOnHolidays', label: 'Válido Feriados' },
      { key: 'hasExclusivity', label: 'Exclusividad' },
      { key: 'exclusivityCondition', label: 'Condición Exclusividad', wide: true },
      { key: 'blackoutDates', label: 'Fechas Bloqueadas', wide: true },
      { key: 'hasOtherBranches', label: 'Otras Sucursales' },
    ],
  },
  {
    title: 'Contenido de la Oferta',
    fields: [
      { key: 'nameEs', label: 'Título de la Oferta', wide: true },
      { key: 'aboutOffer', label: 'Acerca de esta Oferta', wide: true },
      { key: 'goodToKnow', label: 'Lo que conviene saber', wide: true },
      { key: 'whatWeLike', label: 'Lo que nos gusta', wide: true },
      { key: 'howToUseEs', label: 'Cómo Usar', wide: true },
      { key: 'businessReview', label: 'Reseña del Negocio', wide: true },
      { key: 'contactDetails', label: 'Detalles de Contacto', wide: true },
      { key: 'socialMedia', label: 'Redes Sociales', wide: true },
    ],
  },
  {
    title: 'Políticas y Validaciones',
    fields: [
      { key: 'cancellationPolicy', label: 'Política Cancelación', wide: true },
      { key: 'marketValidation', label: 'Validación Mercado', wide: true },
      { key: 'additionalComments', label: 'Comentarios Adicionales', wide: true },
    ],
  },
]

// ---------------------------------------------------------------------------
// PDF-specific HTML renderer
// ---------------------------------------------------------------------------

const LOGO_URL =
  'https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/OFS_Marca_Blanco_02.png?_t=1754077435'

const COLORS = {
  brand: '#e84c0f',
  text: '#1d1d1f',
  secondary: '#6e6e73',
  muted: '#86868b',
  border: '#d2d2d7',
  bgLight: '#f5f5f7',
  white: '#ffffff',
} as const

function renderPDFDocument(opts: {
  requestName: string
  merchant?: string
  businessEmail: string
  category: string
  startDate: string
  endDate: string
  requesterEmail?: string
  bookingData: Record<string, unknown>
  additionalInfo?: BookingRequestPDFOptions['additionalInfo']
}): string {
  const {
    requestName,
    merchant,
    businessEmail,
    category,
    startDate,
    endDate,
    requesterEmail,
    bookingData,
    additionalInfo,
  } = opts

  const get = (key: string): unknown => bookingData[key]
  const eventDays = getEventDaysFromRecord(bookingData)
  const additionalBankAccounts = getAdditionalBankAccountsFromRecord(bookingData)
  const hasEventDays = eventDays.length > 0
  const campaignDurationRaw = get('campaignDuration')
  const campaignDurationValue =
    campaignDurationRaw !== undefined && campaignDurationRaw !== null
      ? String(campaignDurationRaw).trim()
      : ''
  const campaignDurationUnitRaw = String(get('campaignDurationUnit') || 'months').toLowerCase()
  const campaignDurationUnit = campaignDurationUnitRaw === 'days' ? 'days' : 'months'
  const campaignDurationNumber = Number.parseInt(campaignDurationValue, 10)
  const campaignDurationLabel =
    campaignDurationValue
      ? `${campaignDurationValue} ${
          campaignDurationUnit === 'days'
            ? campaignDurationNumber === 1 ? 'día' : 'días'
            : campaignDurationNumber === 1 ? 'mes' : 'meses'
        }`
      : ''
  const timestamp = new Date().toLocaleDateString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // --- section renderer ---------------------------------------------------

  const renderFields = (fields: FieldDef[]): string => {
    const filled = fields.filter((f) => {
      if (hasEventDays && (f.key === 'campaignDuration' || f.key === 'campaignDurationUnit')) return false
      if (!hasEventDays && f.key === 'eventDays') return false
      if (f.key === 'campaignDurationUnit' && !campaignDurationValue) return false
      if (f.key === 'additionalBankAccounts') return additionalBankAccounts.length > 0
      const v = get(f.key)
      return isRenderableValue(v)
    })
    if (filled.length === 0) return ''

    return filled
      .map((f) => {
        const rawValue = fmt(get(f.key))
        const isLong = LONG_TEXT_KEYS.has(f.key) && rawValue.length > 120
        let val: string
        if (f.key === 'eventDays' && hasEventDays) {
          val = eventDays.map((date) => esc(formatEventDayLabel(date))).join('<br/>')
        } else if (f.key === 'additionalBankAccounts') {
          val = additionalBankAccounts.length > 0
            ? additionalBankAccounts.map((line) => esc(line)).join('<br/>')
            : '-'
        } else if (isLong) {
          val = formatRichText(rawValue)
        } else {
          val = esc(rawValue)
        }
        const width = f.wide ? '100%' : '48%'

        if (isLong) {
          return `
            <div style="width:100%;box-sizing:border-box;padding:0 0 16px 0;">
              <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};margin-bottom:6px;">${f.label}</div>
              <div style="font-size:12px;color:${COLORS.text};line-height:1.6;word-break:break-word;background:${COLORS.bgLight};border:1px solid ${COLORS.border};border-radius:8px;padding:12px 16px;">
                ${val}
              </div>
            </div>
          `
        }

        return `
          <div style="width:${width};min-width:200px;box-sizing:border-box;padding:0 0 16px 0;${f.wide ? '' : 'display:inline-block;vertical-align:top;'}">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};margin-bottom:3px;">${f.label}</div>
            <div style="font-size:13px;color:${COLORS.text};line-height:1.5;word-break:break-word;">${val}</div>
          </div>
        `
      })
      .join('')
  }

  const renderSection = (s: SectionDef): string => {
    const content = renderFields(s.fields)
    if (!content) return ''
    return `
      <div style="margin-bottom:8px;page-break-inside:avoid;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${COLORS.brand};border-bottom:2px solid ${COLORS.brand};padding-bottom:6px;margin-bottom:16px;">${s.title}</div>
        <div style="display:flex;flex-wrap:wrap;gap:0 4%;">
          ${content}
        </div>
      </div>
    `
  }

  // --- pricing options -----------------------------------------------------

  interface PricingOpt {
    title?: string
    description?: string
    price?: string | number
    realValue?: string | number
    quantity?: string | number
    limitByUser?: string | number
    maxGiftsPerUser?: string | number
  }

  const unlimitedLabel = (v: string | number | undefined | null): string => {
    if (v === null || v === undefined || String(v).trim() === '') return 'Sin Límite'
    return esc(String(v))
  }

  const renderPricing = (): string => {
    const raw = get('pricingOptions')
    if (!raw || !Array.isArray(raw) || raw.length === 0) return ''
    const options = raw as PricingOpt[]
    const margin = get('offerMargin')

    const thStyle = `text-align:right;padding:10px 8px;font-weight:600;color:${COLORS.secondary};border-bottom:1px solid ${COLORS.border};font-size:11px;`

    return `
      <div style="margin-bottom:8px;page-break-inside:avoid;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${COLORS.brand};border-bottom:2px solid ${COLORS.brand};padding-bottom:6px;margin-bottom:16px;">Estructura de la Oferta</div>

        ${margin ? `
          <div style="margin-bottom:16px;">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};margin-bottom:3px;">Margen Oferta</div>
            <div style="font-size:13px;color:${COLORS.text};">${esc(fmt(margin))}</div>
          </div>
        ` : ''}

        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:${COLORS.bgLight};">
              <th style="text-align:left;padding:10px 8px;font-weight:600;color:${COLORS.secondary};border-bottom:1px solid ${COLORS.border};font-size:11px;">#</th>
              <th style="text-align:left;padding:10px 8px;font-weight:600;color:${COLORS.secondary};border-bottom:1px solid ${COLORS.border};font-size:11px;">Opción</th>
              <th style="${thStyle}">Precio</th>
              <th style="${thStyle}">Valor Real</th>
              <th style="${thStyle}">Cantidad</th>
              <th style="${thStyle}">Max Usuario</th>
              <th style="${thStyle}">Max Regalo</th>
            </tr>
          </thead>
          <tbody>
            ${options
              .map(
                (o, i) => `
              <tr style="${i % 2 === 1 ? `background:${COLORS.bgLight};` : ''}">
                <td style="padding:10px 8px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border};">${i + 1}</td>
                <td style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};">
                  <div style="font-weight:600;color:${COLORS.text};">${esc(o.title)}</div>
                  ${o.description ? `<div style="color:${COLORS.secondary};margin-top:2px;font-size:11px;">${esc(o.description)}</div>` : ''}
                </td>
                <td style="padding:10px 8px;text-align:right;border-bottom:1px solid ${COLORS.border};font-weight:600;color:${COLORS.text};">${o.price ? `$${esc(String(o.price))}` : '—'}</td>
                <td style="padding:10px 8px;text-align:right;border-bottom:1px solid ${COLORS.border};color:${COLORS.secondary};">${o.realValue ? `$${esc(String(o.realValue))}` : '—'}</td>
                <td style="padding:10px 8px;text-align:right;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};">${unlimitedLabel(o.quantity)}</td>
                <td style="padding:10px 8px;text-align:right;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};">${unlimitedLabel(o.limitByUser)}</td>
                <td style="padding:10px 8px;text-align:right;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};">${unlimitedLabel(o.maxGiftsPerUser)}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // --- additional info (legacy) --------------------------------------------

  const renderAdditionalInfo = (): string => {
    if (!additionalInfo?.fields || Object.keys(additionalInfo.fields).length === 0) return ''
    const entries = Object.entries(additionalInfo.fields)
    const title = additionalInfo.templateDisplayName
      ? `Información Adicional — ${esc(additionalInfo.templateDisplayName)}`
      : 'Información Adicional'

    return `
      <div style="margin-bottom:8px;page-break-inside:avoid;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${COLORS.brand};border-bottom:2px solid ${COLORS.brand};padding-bottom:6px;margin-bottom:16px;">${title}</div>
        ${entries
          .map(
            ([label, value]) => `
          <div style="padding:0 0 16px 0;">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};margin-bottom:3px;">${esc(label)}</div>
            <div style="font-size:13px;color:${COLORS.text};line-height:1.5;">${esc(value)}</div>
          </div>
        `,
          )
          .join('')}
      </div>
    `
  }

  // --- build sections HTML -------------------------------------------------

  const sectionsHTML = SECTIONS.map(renderSection).join('')

  // --- full document -------------------------------------------------------

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: ${COLORS.text};
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Page wrapper */
    .page {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 0 15mm;
    }

    /* Header bar */
    .header {
      background: ${COLORS.brand};
      padding: 28px 15mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header img { height: 32px; }
    .header .doc-label {
      font-size: 11px;
      font-weight: 500;
      color: rgba(255,255,255,0.85);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* Summary card */
    .summary {
      background: ${COLORS.bgLight};
      border-radius: 12px;
      padding: 28px 24px;
      margin: 28px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0 32px;
    }
    .summary .item {
      min-width: 140px;
      flex: 1 1 45%;
      padding-bottom: 12px;
    }
    .summary .item.full { flex: 1 1 100%; }
    .summary .label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${COLORS.muted};
      margin-bottom: 2px;
    }
    .summary .value {
      font-size: 15px;
      font-weight: 600;
      color: ${COLORS.text};
      line-height: 1.4;
    }
    .summary .value.small { font-size: 13px; font-weight: 400; }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding: 20px 0;
      border-top: 1px solid ${COLORS.border};
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: ${COLORS.muted};
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <img src="${LOGO_URL}" alt="OfertaSimple" />
    <div class="doc-label">Solicitud de Reserva</div>
  </div>

  <div class="page">

    <!-- Title -->
    <div style="margin-top:28px;">
      <h1 style="margin:0 0 4px 0;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:${COLORS.text};">
        ${esc(requestName.replace(/\s*\|\s*#\d+\s*$/, ''))}
      </h1>
      ${merchant ? `<div style="font-size:16px;color:${COLORS.secondary};font-weight:500;">${esc(merchant)}</div>` : ''}
    </div>

    <!-- Key info summary card -->
    <div class="summary">
      <div class="item">
        <div class="label">Email del Negocio</div>
        <div class="value small">${esc(businessEmail)}</div>
      </div>
      <div class="item">
        <div class="label">Fecha de Inicio (Tentativa)</div>
        <div class="value small">${esc(startDate)}</div>
      </div>
      <div class="item">
        <div class="label">Fecha de Fin (Tentativa)</div>
        <div class="value small">${esc(endDate)}</div>
      </div>
      ${hasEventDays ? `
      <div class="item full">
        <div class="label">Días del Evento</div>
        <div class="value small">${eventDays.map((date) => esc(formatEventDayLabel(date))).join('<br/>')}</div>
      </div>
      ` : campaignDurationLabel ? `
      <div class="item full">
        <div class="label">Duración Campaña</div>
        <div class="value small">${esc(campaignDurationLabel)}</div>
      </div>
      ` : ''}
      ${requesterEmail ? `
      <div class="item full">
        <div class="label">Solicitado por</div>
        <div class="value small">${esc(requesterEmail)}</div>
      </div>
      ` : ''}
    </div>

    <!-- Dynamic sections -->
    ${sectionsHTML}

    <!-- Pricing -->
    ${renderPricing()}

    <!-- Additional info (legacy templates) — intentionally omitted from PDF -->

    <!-- Footer -->
    <div class="footer">
      <span>&copy; ${new Date().getFullYear()} OfertaSimple — Panamá</span>
      <span>Generado: ${esc(timestamp)}</span>
    </div>

  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a professional PDF summary of a booking request.
 */
export async function generateBookingRequestPDF(
  options: BookingRequestPDFOptions,
): Promise<Buffer> {
  try {
    logger.info('[BookingRequestPDF] Generating PDF for:', options.requestName)

    const categoryString = buildCategoryDisplayString(
      options.parentCategory || null,
      options.subCategory1 || null,
      options.subCategory2 || null,
      undefined,
      undefined,
      options.category || null,
    )

    const html = renderPDFDocument({
      requestName: options.requestName,
      businessEmail: options.businessEmail,
      merchant: options.merchant,
      category: categoryString,
      startDate: formatDatePanama(options.startDate),
      endDate: formatDatePanama(options.endDate),
      requesterEmail: options.requesterEmail,
      bookingData: options.bookingData as Record<string, unknown>,
      additionalInfo: options.additionalInfo,
    })

    const pdfBuffer = await generatePDFFromHTML(html, {
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      displayHeaderFooter: false,
    })

    logger.info(`[BookingRequestPDF] PDF generated (${pdfBuffer.length} bytes)`)
    return pdfBuffer
  } catch (error) {
    logger.error('[BookingRequestPDF] Error generating PDF:', error)
    throw new Error(
      `Failed to generate booking request PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Generate a sanitized filename for the booking request PDF.
 */
export function generateBookingRequestPDFFilename(
  requestName: string,
  merchant?: string,
): string {
  const sanitize = (str: string) =>
    str
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase()
      .substring(0, 50)

  const namePart = sanitize(requestName)
  const merchantPart = merchant ? `_${sanitize(merchant)}` : ''
  const datePart = new Date().toISOString().split('T')[0]

  return `solicitud_reserva_${namePart}${merchantPart}_${datePart}.pdf`
}
