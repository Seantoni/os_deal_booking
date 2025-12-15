import type { BookingFormData } from '@/components/RequestForm/types'
import { parseEnhancedDescription } from '@/lib/email/utils/description-parser'
import { getAppBaseUrl } from '@/lib/config/env'

interface BookingRequestEmailProps {
  requestName: string
  businessEmail: string
  merchant?: string
  category?: string
  description?: string
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
  bookingData?: Partial<BookingFormData> | null
  hideActions?: boolean
}

/**
 * Generate HTML string for booking request email
 * This email is sent to the business to approve or reject a booking request
 * Now includes enhanced form data in structured format
 */
export function renderBookingRequestEmail(props: BookingRequestEmailProps): string {
  const {
    requestName,
    businessEmail,
    merchant,
    category,
    description,
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

  // Parse enhanced description
  const enhancedData = parseEnhancedDescription(description)
  const additionalInfoData = additionalInfo
    ? {
        templateDisplayName: additionalInfo.templateDisplayName,
        fields: Object.entries(additionalInfo.fields || {}).map(([label, value]) => ({ label, value })),
      }
    : enhancedData.additionalInfo

const termsLink = tncUrl || `${getAppBaseUrl()}/t-c`

  // Helpers
  const formatValue = (val: any): string => {
    if (Array.isArray(val)) return val.filter(Boolean).join(', ')
    return typeof val === 'string' ? val : val ?? ''
  }

  const renderFieldGrid = (
    title: string,
    fields: Array<{ key: keyof BookingFormData | string; label: string; fullWidth?: boolean }>
  ) => {
    if (!bookingData) return ''
    const filled = fields.filter(f => {
      const value = (bookingData as any)?.[f.key]
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && String(value).trim() !== ''
    })
    if (filled.length === 0) return ''

    const cards = filled
      .map(f => {
        const value = formatValue((bookingData as any)?.[f.key])
        return `
          <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;${f.fullWidth ? 'grid-column:1/-1;' : ''}">
            <p style="margin:0 0 6px 0;font-size:12px;color:#6b7280;font-weight:600;">${escapeHtml(f.label)}</p>
            <p style="margin:0;font-size:14px;color:#111827;white-space:pre-wrap;">${escapeHtml(value)}</p>
          </div>
        `
      })
      .join('')

    return `
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;">
        <p style="font-size:14px;color:#111827;font-weight:700;margin-bottom:10px;">${title}</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;">
          ${cards}
        </div>
      </div>
    `
  }

  // Escape HTML in user-provided content
  const escapeHtml = (text: string | undefined | null) => {
    if (!text) return ''
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Format pricing options
  const renderPricingOptions = () => {
    if (!enhancedData.pricingOptions || enhancedData.pricingOptions.length === 0) return ''
    
    return `
      <div style="margin-top: 16px;">
        <h3 style="font-size: 16px; font-weight: bold; color: #111827; margin-bottom: 12px;">Opciones de Precio:</h3>
        ${enhancedData.pricingOptions.map((opt, i) => `
          <div style="background-color: #ffffff; border-left: 4px solid #2563eb; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
            <p style="font-weight: bold; color: #111827; margin: 0 0 8px 0;">${i + 1}. ${escapeHtml(opt.title)}</p>
            ${opt.description ? `<p style="color: #374151; margin: 0 0 8px 0; font-size: 14px;">${escapeHtml(opt.description)}</p>` : ''}
            ${opt.price && opt.realValue ? `<p style="color: #059669; font-weight: 600; margin: 0 0 4px 0;">Paga $${escapeHtml(opt.price)} y consume $${escapeHtml(opt.realValue)}</p>` : ''}
            ${opt.quantity ? `<p style="color: #6b7280; font-size: 13px; margin: 0;">Cantidad: ${escapeHtml(opt.quantity)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background-color: #2563eb; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;">
        Nueva Solicitud de Booking
      </h1>
      <p style="color: #dbeafe; font-size: 14px; margin: 8px 0 0 0;">
        OS Deals Booking - OfertaSimple
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
        Se ha recibido una nueva solicitud de booking para su negocio. Por favor revise los detalles a continuación:
      </p>

      <!-- Request Details -->
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #111827; margin-top: 0; margin-bottom: 16px;">
          Detalles de la Solicitud
        </h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600; width: 140px;">Nombre del Evento:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: bold;">${escapeHtml(requestName)}</td>
            </tr>
            ${merchant ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Merchant/Aliado:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(merchant)}</td>
            </tr>
            ` : ''}
            ${category ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Categoría:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(category)}</td>
            </tr>
            ` : ''}
            ${enhancedData.campaignDuration ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Duración de Campaña:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(enhancedData.campaignDuration)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Fecha de Inicio:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(startDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Fecha de Fin:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Email del Negocio:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #2563eb;">${escapeHtml(businessEmail)}</td>
            </tr>
            ${requesterEmail ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Solicitado por:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(requesterEmail)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>

        ${enhancedData.redemptionMode ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">Modalidad de Canje:</p>
          <p style="font-size: 14px; color: #374151; margin: 0;">${escapeHtml(enhancedData.redemptionMode)}</p>
        </div>
        ` : ''}

        ${enhancedData.isRecurring ? `
        <div style="margin-top: 12px;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">Recurrencia:</p>
          <p style="font-size: 14px; color: #374151; margin: 0;">${escapeHtml(enhancedData.isRecurring)}</p>
        </div>
        ` : ''}

        ${enhancedData.paymentType ? `
        <div style="margin-top: 12px;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">Tipo de Pago:</p>
          <p style="font-size: 14px; color: #374151; margin: 0;">${escapeHtml(enhancedData.paymentType)}</p>
        </div>
        ` : ''}

        ${enhancedData.redemptionContact ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Contacto de Canje:</p>
          ${enhancedData.redemptionContact.name ? `<p style="font-size: 14px; color: #374151; margin: 4px 0;">Nombre: ${escapeHtml(enhancedData.redemptionContact.name)}</p>` : ''}
          ${enhancedData.redemptionContact.email ? `<p style="font-size: 14px; color: #374151; margin: 4px 0;">Email: ${escapeHtml(enhancedData.redemptionContact.email)}</p>` : ''}
          ${enhancedData.redemptionContact.phone ? `<p style="font-size: 14px; color: #374151; margin: 4px 0;">Teléfono: ${escapeHtml(enhancedData.redemptionContact.phone)}</p>` : ''}
        </div>
        ` : ''}

        ${enhancedData.businessReview ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Reseña del Negocio:</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-wrap; margin: 0;">${escapeHtml(enhancedData.businessReview)}</p>
        </div>
        ` : ''}

        ${enhancedData.offerDetails ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Detalle del Contenido:</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-wrap; margin: 0;">${escapeHtml(enhancedData.offerDetails)}</p>
        </div>
        ` : ''}

        ${renderPricingOptions()}

        ${enhancedData.cancellationPolicy ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Políticas de Cancelación:</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-wrap; margin: 0;">${escapeHtml(enhancedData.cancellationPolicy)}</p>
        </div>
        ` : ''}

        ${enhancedData.additionalComments ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Comentarios Adicionales:</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-wrap; margin: 0;">${escapeHtml(enhancedData.additionalComments)}</p>
        </div>
        ` : ''}

        ${additionalInfoData && additionalInfoData.fields?.length ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">
            Información Adicional${additionalInfoData.templateDisplayName ? ` (${escapeHtml(additionalInfoData.templateDisplayName)})` : ''}:
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
            ${additionalInfoData.fields.map((f) => `
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; font-weight: 600;">${escapeHtml(f.label)}</p>
                <p style="margin: 0; font-size: 13px; color: #111827; white-space: pre-wrap;">${escapeHtml(f.value)}</p>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

      ${renderFieldGrid('Configuración / Operatividad', [
        { key: 'advisorEmail', label: 'Correo del Asesor' },
        { key: 'businessName', label: 'Nombre del Negocio' },
        { key: 'partnerEmail', label: 'Correo del Aliado' },
        { key: 'additionalEmails', label: 'Correos Adicionales' },
        { key: 'assignedAdvisor', label: 'Asesor Asignado' },
        { key: 'salesType', label: 'Tipo de Venta' },
        { key: 'agencyContact', label: 'Contacto de Agencia' },
        { key: 'tentativeLaunchDate', label: 'Fecha Tentativa de Lanzamiento' },
        { key: 'campaignDuration', label: 'Duración de Campaña' },
        { key: 'internalPeriod', label: 'Periodo Interno' },
        { key: 'redemptionMode', label: 'Modalidad de Canje' },
        { key: 'isRecurring', label: 'Oferta Recurrente' },
        { key: 'recurringOfferLink', label: 'Enlace Recurrente', fullWidth: true },
        { key: 'paymentType', label: 'Tipo de Pago' },
        { key: 'paymentInstructions', label: 'Instrucciones de Pago', fullWidth: true },
      ])}

      ${renderFieldGrid('Directorio y Aprobadores', [
        { key: 'redemptionContactName', label: 'Contacto de Canje - Nombre' },
        { key: 'redemptionContactEmail', label: 'Contacto de Canje - Email' },
        { key: 'redemptionContactPhone', label: 'Contacto de Canje - Teléfono' },
        { key: 'approverBusinessName', label: 'Negocio Aprobador' },
        { key: 'approverName', label: 'Nombre Aprobador' },
        { key: 'approverEmail', label: 'Email Aprobador' },
      ])}

      ${renderFieldGrid('Datos Fiscales y Ubicación', [
        { key: 'legalName', label: 'Razón Social' },
        { key: 'rucDv', label: 'RUC y DV' },
        { key: 'bankAccountName', label: 'Nombre en Cuenta Bancaria' },
        { key: 'bank', label: 'Banco' },
        { key: 'accountNumber', label: 'Número de Cuenta' },
        { key: 'accountType', label: 'Tipo de Cuenta' },
        { key: 'addressAndHours', label: 'Dirección y Horario', fullWidth: true },
        { key: 'province', label: 'Provincia' },
        { key: 'district', label: 'Distrito' },
        { key: 'corregimiento', label: 'Corregimiento' },
      ])}

      ${renderFieldGrid('Reglas de Negocio', [
        { key: 'includesTaxes', label: 'Incluye Impuestos' },
        { key: 'validOnHolidays', label: 'Válido en Feriados' },
        { key: 'hasExclusivity', label: 'Tiene Exclusividad' },
        { key: 'blackoutDates', label: 'Fechas Blackout', fullWidth: true },
        { key: 'exclusivityCondition', label: 'Condición de Exclusividad', fullWidth: true },
        { key: 'giftVouchers', label: 'Vouchers para Regalar' },
        { key: 'hasOtherBranches', label: 'Otras Sucursales no Válidas' },
        { key: 'vouchersPerPerson', label: 'Vouchers por Persona' },
        { key: 'commission', label: 'Comisión' },
      ])}

      ${renderFieldGrid('Descripción y Canales', [
        { key: 'contactDetails', label: 'Contacto para Canje' },
        { key: 'socialMedia', label: 'Redes Sociales' },
        { key: 'redemptionMethods', label: 'Métodos de Canje' },
        { key: 'businessReview', label: 'Reseña del Negocio', fullWidth: true },
        { key: 'offerDetails', label: 'Detalle del Contenido', fullWidth: true },
      ])}

      ${renderFieldGrid('Políticas', [
        { key: 'cancellationPolicy', label: 'Políticas de Cancelación', fullWidth: true },
        { key: 'marketValidation', label: 'Validación de Mercado' },
        { key: 'additionalComments', label: 'Comentarios Finales', fullWidth: true },
      ])}
      </div>

      ${hideActions ? '' : `
      <!-- Action Buttons -->
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 16px; color: #374151; font-weight: 600; margin-bottom: 20px;">
          ¿Desea aprobar esta solicitud de booking?
        </p>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <!-- Approve Button -->
          <a href="${approveUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: bold; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            ✓ Aprobar
          </a>

          <!-- Reject Button -->
          <a href="${rejectUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; font-size: 16px; font-weight: bold; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            ✗ No Aprobar
          </a>
        </div>
      </div>
      `}

      <!-- Terms notice -->
      <div style="margin-top: 12px; padding: 14px; background-color: #eef2ff; border: 1px solid #e0e7ff; border-radius: 6px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #4338ca;">
          Al aprobar este acuerdo, también acepto los términos y condiciones publicados en la siguiente página.
        </p>
        <a
          href="${termsLink}"
          style="display: inline-block; padding: 10px 18px; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 600; border-radius: 6px; text-decoration: none;"
        >
          Ver Términos y Condiciones
        </a>
      </div>

      <!-- Footer Note -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
        <p style="margin: 0;">
          Este enlace expirará en 1 año. Si tiene preguntas, por favor contacte a ${escapeHtml(requesterEmail || 'OfertaSimple')}.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        © 2025 OfertaSimple - OS Deals Sistema de Reservas
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
