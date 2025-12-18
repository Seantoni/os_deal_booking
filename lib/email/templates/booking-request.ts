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

  // Section renderer - Table based for Outlook
  const renderSection = (
    title: string,
    fields: Array<{ key: keyof BookingFormData | string; label: string; fullWidth?: boolean; value?: string }>
  ) => {
    if (!bookingData) return ''
    
    // Filter fields that have values
    const filled = fields.filter(f => {
      if (f.value !== undefined) return f.value !== null && String(f.value).trim() !== ''
      const value = (bookingData as any)?.[f.key]
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && String(value).trim() !== ''
    })

    if (filled.length === 0) return ''

    const rows = filled.map(f => {
      const value = f.value !== undefined ? f.value : formatValue((bookingData as any)?.[f.key])
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%;">
              <tr>
                <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">
                  ${escapeHtml(f.label)}
                </td>
              </tr>
              <tr>
                <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827; line-height: 1.5;">
                  ${escapeHtml(value)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    }).join('')

    return `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; width: 100%;">
        <tr>
          <td style="padding-bottom: 15px; border-left: 4px solid #e84c0f; padding-left: 10px;">
            <h3 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; color: #111827; font-weight: 700;">
              ${title}
            </h3>
          </td>
        </tr>
        <tr>
          <td>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%;">
              ${rows}
            </table>
          </td>
        </tr>
      </table>
    `
  }

  // Pricing options renderer - Table based
  const renderPricingOptions = () => {
    const pricingOptions = (bookingData as any)?.pricingOptions
    if (!pricingOptions || !Array.isArray(pricingOptions) || pricingOptions.length === 0) return ''
    
    return `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; width: 100%;">
        <tr>
          <td style="padding-bottom: 15px; border-left: 4px solid #e84c0f; padding-left: 10px;">
            <h3 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; color: #111827; font-weight: 700;">
              Opciones de Precio
            </h3>
          </td>
        </tr>
        <tr>
          <td>
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px;">
              ${pricingOptions.map((opt: any, i: number) => `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; margin-bottom: ${i === pricingOptions.length - 1 ? '0' : '20px'}; border-bottom: ${i === pricingOptions.length - 1 ? 'none' : '1px solid #e2e8f0'};">
                  <tr>
                    <td style="padding-bottom: ${i === pricingOptions.length - 1 ? '0' : '20px'};">
                      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 700; color: #111827; font-size: 16px; margin-bottom: 4px;">
                        ${i + 1}. ${escapeHtml(opt.title)}
          </div>
                      ${opt.description ? `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #4b5563; font-size: 14px; margin-bottom: 8px;">${escapeHtml(opt.description)}</div>` : ''}
                      
                      ${(opt.price && opt.realValue) || opt.quantity ? `
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px;">
                              ${opt.price && opt.realValue ? `
                                <span style="color: #059669; font-weight: 600; background-color: #ecfdf5; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-right: 10px; margin-bottom: 5px;">
                                  Precio: $${escapeHtml(opt.price)} / Valor: $${escapeHtml(opt.realValue)}
                                </span>
                              ` : ''}
                              ${opt.quantity ? `<span style="color: #6b7280; display: inline-block;">Cantidad: ${escapeHtml(opt.quantity)}</span>` : ''}
                            </td>
                          </tr>
                        </table>
                      ` : ''}
                    </td>
                  </tr>
                </table>
        `).join('')}
      </div>
          </td>
        </tr>
      </table>
    `
  }

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud de Aprobación - OfertaSimple</title>
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, h1, h2, h3, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; width: 100% !important;">
  
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Main Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #e84c0f; padding: 20px 30px; border-bottom: 3px solid #c2410c;">
              <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/OFS_Marca_Blanco_02.png?_t=1754077435" alt="OfertaSimple" width="180" style="display: block; border: 0; max-width: 180px; width: 180px;" />
            </td>
          </tr>

          <!-- Main Title Area -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 40px 30px;">
              <h1 style="margin: 0 0 10px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111827; font-size: 24px; font-weight: 700; line-height: 1.3;">
                Solicitud de Aprobación
              </h1>
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #4b5563; font-size: 16px; line-height: 1.5;">
                Se ha generado una nueva propuesta para <strong>${escapeHtml(merchant || requestName)}</strong>.
                <br />Por favor revise los detalles y confirme su aprobación.
              </p>
            </td>
            </tr>

          <!-- Key Information Summary Box -->
          <tr>
            <td style="padding: 0 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; margin-top: -20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 25px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="50%" valign="top" style="padding-bottom: 15px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Evento / Campaña</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin-top: 4px;">${escapeHtml(requestName)}</div>
                        </td>
                        <td width="50%" valign="top" style="padding-bottom: 15px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Categoría</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin-top: 4px;">${escapeHtml(category || 'General')}</div>
                        </td>
            </tr>
            <tr>
                        <td width="50%" valign="top" style="padding-top: 15px; border-top: 1px solid #f3f4f6;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Fecha de Inicio</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin-top: 4px;">${escapeHtml(startDate)}</div>
                        </td>
                        <td width="50%" valign="top" style="padding-top: 15px; border-top: 1px solid #f3f4f6;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Fecha de Fin</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #111827; font-weight: 600; margin-top: 4px;">${escapeHtml(endDate)}</div>
                        </td>
            </tr>
                    </table>
                  </td>
            </tr>
              </table>
            </td>
            </tr>

          <!-- Content Details -->
          <tr>
            <td style="padding: 40px 30px;">
              
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
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; width: 100%;">
                  <tr>
                    <td style="padding-bottom: 15px; border-left: 4px solid #e84c0f; padding-left: 10px;">
                      <h3 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; color: #111827; font-weight: 700;">
                        Información Adicional${additionalInfoData.templateDisplayName ? ` (${escapeHtml(additionalInfoData.templateDisplayName)})` : ''}
                      </h3>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        ${additionalInfoData.fields.map(f => `
                          <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                ${escapeHtml(f.label)}
                              </div>
                              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827; line-height: 1.5;">
                                ${escapeHtml(f.value)}
                              </div>
                            </td>
                          </tr>
                        `).join('')}
                      </table>
                    </td>
                  </tr>
                </table>
              ` : ''}

              ${renderSection('Datos de Contacto', [
                { key: 'redemptionContactName', label: 'Nombre de Contacto' },
                { key: 'redemptionContactEmail', label: 'Email de Contacto' },
                { key: 'redemptionContactPhone', label: 'Teléfono' },
                { key: 'addressAndHours', label: 'Dirección y Horario' },
              ])}

      <!-- Action Buttons -->
              ${!hideActions ? `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; background-color: #f8fafc; border-radius: 12px;">
                  <tr>
                    <td align="center" style="padding: 30px;">
                      <h3 style="margin: 0 0 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; color: #111827;">¿Aprueba esta solicitud?</h3>
                      
                      <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                          <td align="center" style="border-radius: 8px; background-color: #10b981;">
                            <a href="${approveUrl}" target="_blank" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; padding: 16px 32px; border: 1px solid #10b981; border-radius: 8px;">
                              ✓ APROBAR SOLICITUD
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-top: 15px;">
                            <a href="${rejectUrl}" target="_blank" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ef4444; text-decoration: none; display: inline-block; padding: 14px 24px;">
                              Rechazar Solicitud
                            </a>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.5;">
                        Al hacer clic en "Aprobar Solicitud", usted acepta los 
                        <a href="${termsLink}" style="color: #2563eb; text-decoration: underline;">Términos y Condiciones</a>
                        de OfertaSimple.
        </div>
                    </td>
                  </tr>
                </table>
              ` : ''}

              <!-- Footer Info -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #e5e7eb;">
                <tr>
                  <td align="center" style="padding-top: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #9ca3af;">
                    <p style="margin: 0 0 10px 0;">Solicitud enviada por: ${escapeHtml(requesterEmail || 'Equipo de OfertaSimple')}</p>
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
          
          <!-- Footer Branding -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #9ca3af;">
                OfertaSimple · Panamá
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
