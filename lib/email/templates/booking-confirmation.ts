import { parseEnhancedDescription } from '@/lib/email/utils/description-parser'

interface BookingConfirmationEmailProps {
  eventName: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
  description?: string
}

/**
 * Generate HTML string for booking confirmation email
 * This email is sent when an event is booked to confirm the reservation
 * Now includes enhanced form data in structured format
 */
export function renderBookingConfirmationEmail(data: BookingConfirmationEmailProps): string {
  const { eventName, merchant, category, startDate, endDate, description } = data
  
  // Parse enhanced description
  const enhancedData = parseEnhancedDescription(description)
  
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Reserva</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">✓ Reserva Confirmada</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Su solicitud de reserva ha sido <strong>confirmada y reservada</strong> en el calendario.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
          <h2 style="margin-top: 0; color: #1f2937; font-size: 20px;">${escapeHtml(eventName)}</h2>
          ${merchant ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Aliado:</strong> ${escapeHtml(merchant)}</p>` : ''}
          ${category ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Categoría:</strong> ${escapeHtml(category)}</p>` : ''}
          <p style="color: #6b7280; margin: 5px 0;"><strong>Fecha de Inicio:</strong> ${escapeHtml(startDate)}</p>
          <p style="color: #6b7280; margin: 5px 0;"><strong>Fecha de Finalización:</strong> ${escapeHtml(endDate)}</p>
        </div>

        ${enhancedData.campaignDuration ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Duración de Campaña</h3>
            <p style="margin: 0; color: #6b7280;">${escapeHtml(enhancedData.campaignDuration)}</p>
          </div>
        ` : ''}

        ${enhancedData.redemptionMode ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Modalidad de Canje</h3>
            <p style="margin: 0; color: #6b7280;">${escapeHtml(enhancedData.redemptionMode)}</p>
          </div>
        ` : ''}

        ${enhancedData.redemptionContact ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Contacto de Canje</h3>
            ${enhancedData.redemptionContact.name ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Nombre:</strong> ${escapeHtml(enhancedData.redemptionContact.name)}</p>` : ''}
            ${enhancedData.redemptionContact.email ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Email:</strong> ${escapeHtml(enhancedData.redemptionContact.email)}</p>` : ''}
            ${enhancedData.redemptionContact.phone ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Teléfono:</strong> ${escapeHtml(enhancedData.redemptionContact.phone)}</p>` : ''}
          </div>
        ` : ''}

        ${enhancedData.fiscalData ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Datos Fiscales y Bancarios</h3>
            ${enhancedData.fiscalData.legalName ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Razón Social:</strong> ${escapeHtml(enhancedData.fiscalData.legalName)}</p>` : ''}
            ${enhancedData.fiscalData.rucDv ? `<p style="margin: 5px 0; color: #6b7280;"><strong>RUC y DV:</strong> ${escapeHtml(enhancedData.fiscalData.rucDv)}</p>` : ''}
            ${enhancedData.fiscalData.bank ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Banco:</strong> ${escapeHtml(enhancedData.fiscalData.bank)}</p>` : ''}
            ${enhancedData.fiscalData.accountNumber ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Número de Cuenta:</strong> ${escapeHtml(enhancedData.fiscalData.accountNumber)}</p>` : ''}
          </div>
        ` : ''}

        ${enhancedData.businessRules ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Reglas de Negocio</h3>
            ${enhancedData.businessRules.includesTaxes ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Impuestos:</strong> ${escapeHtml(enhancedData.businessRules.includesTaxes)}</p>` : ''}
            ${enhancedData.businessRules.validOnHolidays ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Válido en Feriados:</strong> ${escapeHtml(enhancedData.businessRules.validOnHolidays)}</p>` : ''}
            ${enhancedData.businessRules.commission ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Comisión:</strong> ${escapeHtml(enhancedData.businessRules.commission)}</p>` : ''}
          </div>
        ` : ''}

        ${enhancedData.businessReview ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Reseña del Negocio</h3>
            <p style="margin: 0; color: #6b7280; white-space: pre-wrap;">${escapeHtml(enhancedData.businessReview)}</p>
          </div>
        ` : ''}

        ${enhancedData.offerDetails ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Detalle del Contenido</h3>
            <p style="margin: 0; color: #6b7280; white-space: pre-wrap;">${escapeHtml(enhancedData.offerDetails)}</p>
          </div>
        ` : ''}

        ${enhancedData.pricingOptions && enhancedData.pricingOptions.length > 0 ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Opciones de Precio</h3>
            ${enhancedData.pricingOptions.map((option, index) => `
              <div style="margin-bottom: 15px; padding-bottom: 15px; ${index < enhancedData.pricingOptions!.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
                <p style="margin: 5px 0; color: #1f2937; font-weight: 600;">${escapeHtml(option.title)}</p>
                ${option.description ? `<p style="margin: 5px 0; color: #6b7280;">${escapeHtml(option.description)}</p>` : ''}
                ${option.price ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Precio:</strong> $${escapeHtml(option.price)}</p>` : ''}
                ${option.realValue ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Valor Real:</strong> $${escapeHtml(option.realValue)}</p>` : ''}
                ${option.quantity ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Cantidad:</strong> ${escapeHtml(option.quantity)}</p>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${enhancedData.cancellationPolicy ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Políticas de Cancelación</h3>
            <p style="margin: 0; color: #6b7280; white-space: pre-wrap;">${escapeHtml(enhancedData.cancellationPolicy)}</p>
          </div>
        ` : ''}

        ${enhancedData.additionalComments ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Comentarios Finales</h3>
            <p style="margin: 0; color: #6b7280; white-space: pre-wrap;">${escapeHtml(enhancedData.additionalComments)}</p>
          </div>
        ` : ''}
        
        <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; color: #065f46; font-weight: 600;">✓ Su reserva está confirmada y lista para ser publicada.</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
        <p>Este es un correo automático, por favor no responda.</p>
        <p>OfertaSimple Sistema de Reservas</p>
      </div>
    </body>
    </html>
  `
}
