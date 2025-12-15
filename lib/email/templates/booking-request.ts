import type { BookingFormData } from '@/components/RequestForm/types'
import { getAppBaseUrl } from '@/lib/config/env'

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
  bookingData?: Partial<BookingFormData> | null
  hideActions?: boolean
}

/**
 * Generate HTML string for booking request email
 * Optimized for readability and clarity with OfertaSimple branding
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
  const formatValue = (val: any): string => {
    if (Array.isArray(val)) return val.filter(Boolean).join(', ')
    return typeof val === 'string' ? val : val ?? ''
  }

  const escapeHtml = (text: string | undefined | null) => {
    if (!text) return ''
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Section renderer
  const renderSection = (
    title: string,
    fields: Array<{ key: keyof BookingFormData | string; label: string; fullWidth?: boolean; value?: string }>
  ) => {
    if (!bookingData) return ''
    
    // Filter fields that have values
    const filled = fields.filter(f => {
      // If direct value provided, check it
      if (f.value !== undefined) return f.value !== null && String(f.value).trim() !== ''
      
      // Otherwise check bookingData
      const value = (bookingData as any)?.[f.key]
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && String(value).trim() !== ''
    })

    if (filled.length === 0) return ''

    const rows = filled.map(f => {
      const value = f.value !== undefined ? f.value : formatValue((bookingData as any)?.[f.key])
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              ${escapeHtml(f.label)}
            </div>
            <div style="font-size: 15px; color: #111827; line-height: 1.5;">
              ${escapeHtml(value)}
            </div>
          </td>
        </tr>
      `
    }).join('')

    return `
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #111827; font-weight: 700; border-left: 4px solid #e84c0f; padding-left: 10px;">
          ${title}
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${rows}
        </table>
      </div>
    `
  }

  // Pricing options renderer
  const renderPricingOptions = () => {
    const pricingOptions = (bookingData as any)?.pricingOptions
    if (!pricingOptions || !Array.isArray(pricingOptions) || pricingOptions.length === 0) return ''
    
    return `
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #111827; font-weight: 700; border-left: 4px solid #e84c0f; padding-left: 10px;">
          Opciones de Precio
        </h3>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px;">
          ${pricingOptions.map((opt: any, i: number) => `
            <div style="margin-bottom: ${i === pricingOptions.length - 1 ? '0' : '20px'}; padding-bottom: ${i === pricingOptions.length - 1 ? '0' : '20px'}; border-bottom: ${i === pricingOptions.length - 1 ? 'none' : '1px solid #e2e8f0'};">
              <div style="font-weight: 700; color: #111827; font-size: 16px; margin-bottom: 4px;">
                ${i + 1}. ${escapeHtml(opt.title)}
              </div>
              ${opt.description ? `<div style="color: #4b5563; font-size: 14px; margin-bottom: 8px;">${escapeHtml(opt.description)}</div>` : ''}
              <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 14px;">
                ${opt.price && opt.realValue ? `
                  <span style="color: #059669; font-weight: 600; background-color: #ecfdf5; padding: 2px 8px; border-radius: 4px;">
                    Precio: $${escapeHtml(opt.price)} / Valor: $${escapeHtml(opt.realValue)}
                  </span>
                ` : ''}
                ${opt.quantity ? `<span style="color: #6b7280;">Cantidad: ${escapeHtml(opt.quantity)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud de Aprobación - OfertaSimple</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-text-size-adjust: none;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header with Branding -->
    <div style="background-color: #ffffff; padding: 20px 30px; border-bottom: 3px solid #e84c0f; text-align: center;">
       <!-- Assuming logo exists at this URL, otherwise just text -->
       <div style="font-size: 24px; font-weight: 800; color: #e84c0f; letter-spacing: -0.5px;">
         OfertaSimple
       </div>
       <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">
         OS Deals Booking
       </div>
    </div>

    <!-- Main Title Area -->
    <div style="background-color: #f8fafc; padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0 0 10px 0; color: #111827; font-size: 24px; font-weight: 700; line-height: 1.3;">
        Solicitud de Aprobación
      </h1>
      <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
        Se ha generado una nueva propuesta para <strong>${escapeHtml(merchant || requestName)}</strong>.
        <br>Por favor revise los detalles y confirme su aprobación.
      </p>
    </div>

    <!-- Key Information Summary Box -->
    <div style="padding: 0 30px;">
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-top: -20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding-bottom: 15px; width: 50%;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Evento / Campaña</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600; margin-top: 4px;">${escapeHtml(requestName)}</div>
            </td>
            <td style="padding-bottom: 15px; width: 50%;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Categoría</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600; margin-top: 4px;">${escapeHtml(category || 'General')}</div>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 15px; border-top: 1px solid #f3f4f6;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Fecha de Inicio</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600; margin-top: 4px;">${escapeHtml(startDate)}</div>
            </td>
            <td style="padding-top: 15px; border-top: 1px solid #f3f4f6;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Fecha de Fin</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600; margin-top: 4px;">${escapeHtml(endDate)}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Content Details -->
    <div style="padding: 40px 30px;">
      
      ${renderSection('Información General', [
        { key: 'merchant', label: 'Merchant / Aliado', value: merchant },
        { key: 'businessEmail', label: 'Email del Negocio', value: businessEmail },
        { key: 'campaignDuration', label: 'Duración de Campaña' },
        { key: 'redemptionMode', label: 'Modalidad de Canje' },
        { key: 'isRecurring', label: 'Recurrencia' },
        { key: 'paymentType', label: 'Tipo de Pago' },
      ])}

      ${renderSection('Reseña y Contenido', [
        { key: 'businessReview', label: 'Reseña del Negocio' },
        { key: 'offerDetails', label: 'Detalle de la Oferta' },
      ])}

      ${renderPricingOptions()}

      ${renderSection('Condiciones y Políticas', [
        { key: 'cancellationPolicy', label: 'Políticas de Cancelación' },
        { key: 'additionalComments', label: 'Comentarios Adicionales' },
        { key: 'validOnHolidays', label: 'Válido en Feriados' },
        { key: 'appointmentRequired', label: 'Requiere Cita Previa' },
      ])}

      <!-- Dynamic Additional Info -->
      ${additionalInfoData && additionalInfoData.fields?.length ? `
        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #111827; font-weight: 700; border-left: 4px solid #e84c0f; padding-left: 10px;">
            Información Adicional${additionalInfoData.templateDisplayName ? ` (${escapeHtml(additionalInfoData.templateDisplayName)})` : ''}
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${additionalInfoData.fields.map(f => `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                  <div style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                    ${escapeHtml(f.label)}
                  </div>
                  <div style="font-size: 15px; color: #111827; line-height: 1.5;">
                    ${escapeHtml(f.value)}
                  </div>
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}

      ${renderSection('Datos de Contacto', [
        { key: 'redemptionContactName', label: 'Nombre de Contacto' },
        { key: 'redemptionContactEmail', label: 'Email de Contacto' },
        { key: 'redemptionContactPhone', label: 'Teléfono' },
        { key: 'addressAndHours', label: 'Dirección y Horario' },
      ])}

      <!-- Action Buttons -->
      ${!hideActions ? `
        <div style="margin-top: 40px; background-color: #f8fafc; padding: 30px; border-radius: 12px; text-align: center;">
          <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #111827;">¿Aprueba esta solicitud?</h3>
          
          <div style="display: flex; flex-direction: column; gap: 15px; max-width: 300px; margin: 0 auto;">
            <a href="${approveUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: bold; padding: 16px 24px; border-radius: 8px; text-decoration: none; text-align: center; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
              ✓ APROBAR SOLICITUD
            </a>
            
            <a href="${rejectUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #ffffff; color: #ef4444; border: 2px solid #ef4444; font-size: 16px; font-weight: bold; padding: 14px 24px; border-radius: 8px; text-decoration: none; text-align: center;">
              Rechazar Solicitud
            </a>
          </div>

          <div style="margin-top: 20px; font-size: 13px; color: #6b7280; line-height: 1.5;">
            Al hacer clic en "Aprobar Solicitud", usted acepta los 
            <a href="${termsLink}" style="color: #2563eb; text-decoration: underline;">Términos y Condiciones</a>
            de OfertaSimple.
          </div>
        </div>
      ` : ''}

      <!-- Footer Info -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
        <p style="margin: 0 0 10px 0;">Solicitud enviada por: ${escapeHtml(requesterEmail || 'Equipo de OfertaSimple')}</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.</p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim()
}
