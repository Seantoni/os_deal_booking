interface BookingConfirmationEmailProps {
  eventName: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
}

/**
 * Generate HTML string for booking confirmation email
 * This email is sent when an event is booked to confirm the reservation
 */
export function renderBookingConfirmationEmail(data: BookingConfirmationEmailProps): string {
  const { eventName, merchant, category, startDate, endDate } = data
  
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
