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

const fmt = (v: unknown): string => {
  if (Array.isArray(v)) return v.filter(Boolean).join(', ')
  if (v === null || v === undefined) return ''
  return typeof v === 'string' ? v : String(v)
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
    title: 'Configuración y Ventas',
    fields: [
      { key: 'advisorEmail', label: 'Email Asesor' },
      { key: 'assignedAdvisor', label: 'Asesor Asignado' },
      { key: 'partnerEmail', label: 'Email Socio' },
      { key: 'additionalEmails', label: 'Emails Adicionales', wide: true },
      { key: 'salesType', label: 'Tipo de Venta' },
      { key: 'agencyContact', label: 'Contacto Agencia' },
      { key: 'tentativeLaunchDate', label: 'Fecha Tentativa' },
      { key: 'internalPeriod', label: 'Periodo Interno' },
      { key: 'campaignDuration', label: 'Duración Campaña' },
      { key: 'campaignDurationUnit', label: 'Unidad Duración' },
    ],
  },
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
    title: 'Contenido y Marketing',
    fields: [
      { key: 'shortTitle', label: 'Título Corto', wide: true },
      { key: 'businessReview', label: 'Reseña Negocio', wide: true },
      { key: 'whatWeLike', label: 'Lo que nos gusta', wide: true },
      { key: 'aboutCompany', label: 'Sobre la Empresa', wide: true },
      { key: 'aboutOffer', label: 'Sobre la Oferta', wide: true },
      { key: 'goodToKnow', label: 'Lo que conviene saber', wide: true },
      { key: 'contactDetails', label: 'Detalles Contacto', wide: true },
      { key: 'socialMedia', label: 'Redes Sociales', wide: true },
    ],
  },
  {
    title: 'Detalles Específicos del Servicio',
    fields: [
      // Restaurant (legacy + template)
      { key: 'validForDineIn', label: 'Válido en Local' },
      { key: 'validForTakeout', label: 'Válido para Llevar' },
      { key: 'validForDelivery', label: 'Válido a Domicilio' },
      { key: 'deliveryAreas', label: 'Áreas de Entrega' },
      { key: 'orderMethod', label: 'Método de Pedido' },
      { key: 'validForFullMenu', label: 'Válido Menú Completo' },
      { key: 'applicableBeverages', label: 'Bebidas Aplicables' },
      { key: 'requiresReservation', label: 'Requiere Reserva' },
      { key: 'lunchHours', label: 'Horario Almuerzo' },
      { key: 'dinnerHours', label: 'Horario Cena' },
      { key: 'restaurantValidDineIn', label: 'Válido en Local' },
      { key: 'restaurantValidTakeout', label: 'Válido para Llevar' },
      { key: 'restaurantValidDelivery', label: 'Válido a Domicilio' },
      { key: 'restaurantDeliveryCost', label: 'Costo Domicilio' },
      { key: 'restaurantDeliveryAreas', label: 'Áreas Domicilio' },
      { key: 'restaurantValidFullMenu', label: 'Válido Menú Completo' },
      { key: 'restaurantApplicableBeverages', label: 'Bebidas Aplicables' },
      { key: 'restaurantRequiresReservation', label: 'Requiere Reserva' },
      // Hotel
      { key: 'hotelCheckIn', label: 'Check-In' },
      { key: 'hotelCheckOut', label: 'Check-Out' },
      { key: 'hotelRoomType', label: 'Tipo Habitación' },
      { key: 'hotelIncludesITBMS', label: 'Incluye ITBMS' },
      { key: 'hotelIncludesHotelTax', label: 'Incluye Imp. Hotelero' },
      { key: 'hotelMaxPeoplePerRoom', label: 'Max Personas/Hab' },
      { key: 'hotelChildPolicy', label: 'Política Niños' },
      { key: 'hotelAcceptsPets', label: 'Acepta Mascotas' },
      { key: 'hotelIncludesParking', label: 'Incluye Estacionamiento' },
      // Products
      { key: 'productBrand', label: 'Marca' },
      { key: 'productModel', label: 'Modelo' },
      { key: 'productWarranty', label: 'Garantía' },
      { key: 'productPickupLocation', label: 'Lugar Retiro' },
      // Events
      { key: 'eventStartTime', label: 'Inicio Evento' },
      { key: 'eventDoorsOpenTime', label: 'Apertura Puertas' },
      { key: 'eventTicketPickupLocation', label: 'Retiro Boletos' },
      { key: 'eventMinimumAge', label: 'Edad Mínima' },
      // Courses
      { key: 'courseFormat', label: 'Formato Curso' },
      { key: 'courseDuration', label: 'Duración Curso' },
      { key: 'courseIncludesCertificate', label: 'Incluye Certificado' },
      // Pets
      { key: 'petServiceIncludes', label: 'Incluye' },
      { key: 'petRestrictions', label: 'Restricciones' },
      { key: 'petServiceDuration', label: 'Duración' },
      // Tours
      { key: 'tourDeparture', label: 'Salida' },
      { key: 'tourReturn', label: 'Regreso' },
      { key: 'tourIncludesMeals', label: 'Incluye Comidas' },
      { key: 'tourIncludesGuide', label: 'Incluye Guía' },
      // Health / Beauty
      { key: 'massageDuration', label: 'Duración Masaje' },
      { key: 'facialDescription', label: 'Descripción Facial' },
      { key: 'dentalMinAge', label: 'Edad Mínima Dental' },
      { key: 'gymMembershipIncluded', label: 'Membresía Incluida' },
      { key: 'labFastingRequired', label: 'Requiere Ayuno' },
      // Auto
      { key: 'autoServiceDuration', label: 'Duración Servicio' },
      { key: 'autoValidHolidays', label: 'Válido Feriados' },
      { key: 'rentalDeposit', label: 'Depósito Alquiler' },
      // Home
      { key: 'acHomeCoverageAreas', label: 'Áreas Cobertura' },
      { key: 'cateringDeliveryAreas', label: 'Áreas Catering' },
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
      const v = get(f.key)
      if (Array.isArray(v)) return v.length > 0
      return v !== undefined && v !== null && String(v).trim() !== ''
    })
    if (filled.length === 0) return ''

    return filled
      .map((f) => {
        const val = esc(fmt(get(f.key)))
        const width = f.wide ? '100%' : '48%'
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
  }

  const renderPricing = (): string => {
    const raw = get('pricingOptions')
    if (!raw || !Array.isArray(raw) || raw.length === 0) return ''
    const options = raw as PricingOpt[]
    const margin = get('offerMargin')

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
              <th style="text-align:left;padding:10px 12px;font-weight:600;color:${COLORS.secondary};border-bottom:1px solid ${COLORS.border};">#</th>
              <th style="text-align:left;padding:10px 12px;font-weight:600;color:${COLORS.secondary};border-bottom:1px solid ${COLORS.border};">Opción</th>
              <th style="text-align:right;padding:10px 12px;font-weight:600;color:${COLORS.secondary};border-bottom:1px solid ${COLORS.border};">Precio</th>
              <th style="text-align:right;padding:10px 12px;font-weight:600;color:${COLORS.secondary};border-bottom:1px solid ${COLORS.border};">Valor Real</th>
              <th style="text-align:right;padding:10px 12px;font-weight:600;color:${COLORS.secondary};border-bottom:1px solid ${COLORS.border};">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${options
              .map(
                (o, i) => `
              <tr style="${i % 2 === 1 ? `background:${COLORS.bgLight};` : ''}">
                <td style="padding:10px 12px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border};">${i + 1}</td>
                <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};">
                  <div style="font-weight:600;color:${COLORS.text};">${esc(o.title)}</div>
                  ${o.description ? `<div style="color:${COLORS.secondary};margin-top:2px;font-size:11px;">${esc(o.description)}</div>` : ''}
                </td>
                <td style="padding:10px 12px;text-align:right;border-bottom:1px solid ${COLORS.border};font-weight:600;color:${COLORS.text};">${o.price ? `$${esc(String(o.price))}` : '—'}</td>
                <td style="padding:10px 12px;text-align:right;border-bottom:1px solid ${COLORS.border};color:${COLORS.secondary};">${o.realValue ? `$${esc(String(o.realValue))}` : '—'}</td>
                <td style="padding:10px 12px;text-align:right;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};">${o.quantity ?? '—'}</td>
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
        ${esc(requestName)}
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
        <div class="label">Categoría</div>
        <div class="value small">${esc(category || 'General')}</div>
      </div>
      <div class="item">
        <div class="label">Fecha de Inicio</div>
        <div class="value small">${esc(startDate)}</div>
      </div>
      <div class="item">
        <div class="label">Fecha de Fin</div>
        <div class="value small">${esc(endDate)}</div>
      </div>
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

    <!-- Additional info (legacy templates) -->
    ${renderAdditionalInfo()}

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
