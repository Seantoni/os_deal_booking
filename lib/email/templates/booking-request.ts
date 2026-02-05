import type { BookingFormData } from '@/components/RequestForm/types'
import { getAppBaseUrl } from '@/lib/config/env'
import { 
  renderEmailLayout, 
  renderSectionTitle, 
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
 * Generate HTML string for booking request email
 * Optimized for cross-client compatibility (Outlook, Gmail, etc.)
 */
export function renderBookingRequestEmail(props: BookingRequestEmailProps): string {
  const {
    requestName,
    businessEmail,
    merchant,
    category,
    startDate,
    endDate,
    approveUrl,
    rejectUrl,
    requesterEmail,
    additionalInfo,
    tncUrl,
    bookingData,
    hideActions = false,
  } = props

  // Get data from bookingData
  const additionalInfoData = additionalInfo
    ? {
        templateDisplayName: additionalInfo.templateDisplayName,
        fields: Object.entries(additionalInfo.fields || {}).map(([label, value]) => ({ label, value })),
      }
    : null

  const termsLink = tncUrl || `${getAppBaseUrl()}/t-c`

  // Helpers
  const formatValue = (val: unknown): string => {
    if (Array.isArray(val)) return val.filter(Boolean).join(', ')
    if (val === null || val === undefined) return ''
    return typeof val === 'string' ? val : String(val)
  }

  // Helper to safely access booking data fields
  const getBookingValue = (key: string): unknown => {
    if (!bookingData) return undefined
    return (bookingData as Record<string, unknown>)[key]
  }

  // Section renderer
  const renderSection = (
    title: string,
    fields: Array<{ key: keyof BookingFormData | string; label: string; fullWidth?: boolean; value?: string }>
  ) => {
    if (!bookingData) return ''

    // Filter fields that have values
    const filled = fields.filter(f => {
      if (f.value !== undefined) return f.value !== null && String(f.value).trim() !== ''
      const value = getBookingValue(f.key)
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && String(value).trim() !== ''
    })

    if (filled.length === 0) return ''

    const content = filled.map(f => {
      const value = f.value !== undefined ? f.value : formatValue(getBookingValue(f.key))
      // Don't truncate content in email
      return renderKeyValue(f.label, escapeHtml(value), f.fullWidth || false)
    }).join('')

    return `
      ${renderSectionTitle(title)}
      <div>
        ${content}
      </div>
    `
  }

  // Pricing option type for rendering
  interface PricingOption {
    title?: string
    description?: string
    price?: string | number
    realValue?: string | number
    quantity?: string | number
  }

  // Pricing options renderer
  const renderPricingOptions = () => {
    const pricingOptionsRaw = getBookingValue('pricingOptions')
    if (!pricingOptionsRaw || !Array.isArray(pricingOptionsRaw) || pricingOptionsRaw.length === 0) return ''

    const pricingOptions = pricingOptionsRaw as PricingOption[]

    return `
      ${renderSectionTitle('Estructura de la Oferta')}
      
      ${renderKeyValue('Margen Oferta', escapeHtml(formatValue(getBookingValue('offerMargin'))), true)}

      <div style="margin-top: 16px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: ${EMAIL_STYLES.colors.secondary}; text-transform: uppercase; letter-spacing: 0.05em;">
        Opciones de Precio
      </div>
      <div style="background-color: #f5f5f7; border-radius: 12px; padding: 20px;">
        ${pricingOptions.map((opt: PricingOption, i: number) => `
          <div style="${i < pricingOptions.length - 1 ? 'margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e5e5;' : ''}">
            <div style="font-weight: 600; font-size: 15px; color: ${EMAIL_STYLES.colors.text}; margin-bottom: 4px;">
              ${i + 1}. ${escapeHtml(opt.title)}
            </div>
            ${opt.description ? `<div style="font-size: 14px; color: ${EMAIL_STYLES.colors.secondary}; margin-bottom: 8px;">${escapeHtml(opt.description)}</div>` : ''}

            ${(opt.price && opt.realValue) || opt.quantity ? `
              <div style="font-size: 13px;">
                ${opt.price && opt.realValue ? `
                  <span style="color: ${EMAIL_STYLES.colors.success}; font-weight: 600; background-color: rgba(52, 199, 89, 0.1); padding: 2px 8px; border-radius: 6px; display: inline-block; margin-right: 10px;">
                    Precio: $${escapeHtml(String(opt.price))} / Valor: $${escapeHtml(String(opt.realValue))}
                  </span>
                ` : ''}
                ${opt.quantity ? `<span style="color: ${EMAIL_STYLES.colors.secondary};">Cantidad: ${escapeHtml(String(opt.quantity))}</span>` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `
  }

  const content = `
    <!-- Header Title -->
    <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em; text-align: center;">
      Solicitud de Aprobación
    </h1>
    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Nueva propuesta para <strong>${escapeHtml(merchant || requestName)}</strong>.
    </p>

    <!-- Key Info Summary -->
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
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="margin-bottom: 16px;">
          ${renderButton('Aprobar', approveUrl, 'primary')}
          <span style="display: inline-block; width: 12px;"></span>
          ${renderButton('Rechazar', rejectUrl, 'danger')}
        </div>
        <div style="font-size: 12px; color: ${EMAIL_STYLES.colors.secondary};">
          Al aprobar, acepta los <a href="${termsLink}" style="color: ${EMAIL_STYLES.colors.secondary}; text-decoration: underline;">Términos y Condiciones</a>.
        </div>
      </div>
      ${renderDivider()}
    ` : ''}

    <!-- 1. Configuración y Ventas -->
    ${renderSection('Configuración y Ventas', [
      { key: 'advisorEmail', label: 'Email Asesor' },
      { key: 'assignedAdvisor', label: 'Asesor Asignado' },
      { key: 'partnerEmail', label: 'Email Socio' },
      { key: 'additionalEmails', label: 'Emails Adicionales', fullWidth: true },
      { key: 'salesType', label: 'Tipo de Venta' },
      { key: 'agencyContact', label: 'Contacto Agencia' },
      { key: 'tentativeLaunchDate', label: 'Fecha Tentativa' },
      { key: 'internalPeriod', label: 'Periodo Interno' },
      { key: 'campaignDuration', label: 'Duración Campaña' },
      { key: 'campaignDurationUnit', label: 'Unidad Duración' },
    ])}

    <!-- 2. Datos del Negocio y Responsables -->
    ${renderSection('Datos del Negocio y Responsables', [
      { key: 'businessName', label: 'Nombre del Negocio' },
      { key: 'legalName', label: 'Razón Social' },
      { key: 'approverName', label: 'Nombre Aprobador' },
      { key: 'approverEmail', label: 'Email Aprobador' },
      { key: 'approverBusinessName', label: 'Empresa Aprobadora' },
      { key: 'redemptionContactName', label: 'Nombre Contacto Canje' },
      { key: 'redemptionContactEmail', label: 'Email Contacto Canje' },
      { key: 'redemptionContactPhone', label: 'Teléfono Contacto Canje' },
      { key: 'addressAndHours', label: 'Dirección y Horario', fullWidth: true },
      { key: 'provinceDistrictCorregimiento', label: 'Ubicación' },
    ])}

    <!-- 3. Datos Bancarios y Fiscales -->
    ${renderSection('Datos Bancarios y Fiscales', [
      { key: 'rucDv', label: 'RUC / DV' },
      { key: 'bank', label: 'Banco' },
      { key: 'bankAccountName', label: 'Nombre Cuenta' },
      { key: 'accountNumber', label: 'Número Cuenta' },
      { key: 'accountType', label: 'Tipo Cuenta' },
    ])}

    <!-- 4. Operatividad y Pagos -->
    ${renderSection('Operatividad y Pagos', [
      { key: 'redemptionMode', label: 'Modalidad Canje' },
      { key: 'redemptionMethods', label: 'Métodos de Canje', fullWidth: true },
      { key: 'isRecurring', label: 'Es Recurrente' },
      { key: 'recurringOfferLink', label: 'Link Oferta Recurrente', fullWidth: true },
      { key: 'paymentType', label: 'Tipo Pago' },
      { key: 'paymentInstructions', label: 'Instrucciones Pago', fullWidth: true },
    ])}

    <!-- 5. Reglas de Negocio -->
    ${renderSection('Reglas de Negocio', [
      { key: 'includesTaxes', label: 'Incluye Impuestos' },
      { key: 'validOnHolidays', label: 'Válido Feriados' },
      { key: 'hasExclusivity', label: 'Exclusividad' },
      { key: 'exclusivityCondition', label: 'Condición Exclusividad', fullWidth: true },
      { key: 'blackoutDates', label: 'Fechas Bloqueadas', fullWidth: true },
      { key: 'hasOtherBranches', label: 'Otras Sucursales' },
    ])}

    <!-- 6. Contenido y Marketing -->
    ${renderSection('Contenido y Marketing', [
      { key: 'shortTitle', label: 'Título Corto', fullWidth: true },
      { key: 'businessReview', label: 'Reseña Negocio', fullWidth: true },
      { key: 'whatWeLike', label: 'Lo que nos gusta', fullWidth: true },
      { key: 'aboutCompany', label: 'Sobre la Empresa', fullWidth: true },
      { key: 'aboutOffer', label: 'Sobre la Oferta', fullWidth: true },
      { key: 'goodToKnow', label: 'Lo que conviene saber', fullWidth: true },
      { key: 'contactDetails', label: 'Detalles Contacto', fullWidth: true },
      { key: 'socialMedia', label: 'Redes Sociales', fullWidth: true },
    ])}

    <!-- 7. Estructura de la Oferta -->
    ${renderPricingOptions()}

    <!-- 8. Detalles Específicos del Servicio -->
    ${renderSection('Detalles Específicos del Servicio', [
      // Restaurante
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
      
      // Template Restaurante
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
      
      // Productos
      { key: 'productBrand', label: 'Marca' },
      { key: 'productModel', label: 'Modelo' },
      { key: 'productWarranty', label: 'Garantía' },
      { key: 'productPickupLocation', label: 'Lugar Retiro' },
      
      // Eventos
      { key: 'eventStartTime', label: 'Inicio Evento' },
      { key: 'eventDoorsOpenTime', label: 'Apertura Puertas' },
      { key: 'eventTicketPickupLocation', label: 'Retiro Boletos' },
      { key: 'eventMinimumAge', label: 'Edad Mínima' },
      
      // Cursos
      { key: 'courseFormat', label: 'Formato Curso' },
      { key: 'courseDuration', label: 'Duración Curso' },
      { key: 'courseIncludesCertificate', label: 'Incluye Certificado' },
      
      // Mascotas
      { key: 'petServiceIncludes', label: 'Incluye' },
      { key: 'petRestrictions', label: 'Restricciones' },
      { key: 'petServiceDuration', label: 'Duración' },
      
      // Tours
      { key: 'tourDeparture', label: 'Salida' },
      { key: 'tourReturn', label: 'Regreso' },
      { key: 'tourIncludesMeals', label: 'Incluye Comidas' },
      { key: 'tourIncludesGuide', label: 'Incluye Guía' },
      
      // Salud/Belleza (General)
      { key: 'massageDuration', label: 'Duración Masaje' },
      { key: 'facialDescription', label: 'Descripción Facial' },
      { key: 'dentalMinAge', label: 'Edad Mínima Dental' },
      { key: 'gymMembershipIncluded', label: 'Membresía Incluida' },
      { key: 'labFastingRequired', label: 'Requiere Ayuno' },
      
      // Servicios Autos
      { key: 'autoServiceDuration', label: 'Duración Servicio' },
      { key: 'autoValidHolidays', label: 'Válido Feriados' },
      { key: 'rentalDeposit', label: 'Depósito Alquiler' },
      
      // Servicios Hogar
      { key: 'acHomeCoverageAreas', label: 'Áreas Cobertura' },
      { key: 'cateringDeliveryAreas', label: 'Áreas Catering' },
    ])}

    <!-- 9. Políticas y Validaciones -->
    ${renderSection('Políticas y Validaciones', [
      { key: 'cancellationPolicy', label: 'Política Cancelación', fullWidth: true },
      { key: 'marketValidation', label: 'Validación Mercado', fullWidth: true },
      { key: 'additionalComments', label: 'Comentarios Adicionales', fullWidth: true },
    ])}

    <!-- Dynamic Additional Info (Legacy) -->
    ${additionalInfoData && additionalInfoData.fields?.length ? `
      ${renderSectionTitle(`Información Adicional${additionalInfoData.templateDisplayName ? ` (${escapeHtml(additionalInfoData.templateDisplayName)})` : ''}`)}
      <div>
        ${additionalInfoData.fields.map(f => renderKeyValue(f.label, escapeHtml(f.value), true)).join('')}
      </div>
    ` : ''}

    <div style="margin-top: 40px; font-size: 12px; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Solicitud enviada por: ${escapeHtml(requesterEmail || 'Equipo de OfertaSimple')}
    </div>

    <!-- Bottom Action Buttons -->
    ${!hideActions ? `
      ${renderDivider()}
      <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
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
  `

  return renderEmailLayout({
    title: 'Solicitud de Aprobación - OfertaSimple',
    previewText: `Nueva propuesta para ${merchant || requestName}`,
    children: content
  })
}
