interface BookingConfirmationEmailProps {
  eventName: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
}

/**
 * Generate HTML string for booking confirmation email
 * Optimized for readability and clarity with OfertaSimple branding
 */
export function renderBookingConfirmationEmail(data: BookingConfirmationEmailProps): string {
  const { eventName, merchant, category, startDate, endDate } = data
  
  // Helpers
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
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reserva Confirmada - OfertaSimple</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-text-size-adjust: none;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header with Branding -->
    <div style="background-color: #ffffff; padding: 20px 30px; border-bottom: 3px solid #e84c0f; text-align: center;">
       <div style="font-size: 24px; font-weight: 800; color: #e84c0f; letter-spacing: -0.5px;">
         OfertaSimple
       </div>
       <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">
         OS Deals Booking
       </div>
    </div>

    <!-- Main Title Area -->
    <div style="background-color: #f8fafc; padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0 0 10px 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1.3;">
        ✓ Reserva Confirmada
      </h1>
      <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.5;">
        La reserva para <strong>${escapeHtml(eventName)}</strong> ha sido confirmada exitosamente.
      </p>
    </div>

    <!-- Confirmation Details Box -->
    <div style="padding: 0 30px 40px 30px;">
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; margin-top: -20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <div style="margin-bottom: 25px; border-bottom: 1px solid #f3f4f6; padding-bottom: 20px;">
          <h2 style="margin: 0 0 5px 0; font-size: 20px; color: #111827; font-weight: 700;">
            ${escapeHtml(eventName)}
          </h2>
          ${merchant ? `<div style="color: #6b7280; font-size: 14px;">Merchant/Aliado: ${escapeHtml(merchant)}</div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          ${category ? `
          <tr>
            <td style="padding-bottom: 15px;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Categoría</div>
              <div style="font-size: 15px; color: #111827;">${escapeHtml(category)}</div>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding-bottom: 15px;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Fecha de Inicio</div>
              <div style="font-size: 15px; color: #111827;">${escapeHtml(startDate)}</div>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Fecha de Finalización</div>
              <div style="font-size: 15px; color: #111827;">${escapeHtml(endDate)}</div>
            </td>
          </tr>
        </table>

        <!-- Status Badge -->
        <div style="margin-top: 25px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px; text-align: center;">
          <span style="color: #059669; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span style="font-size: 18px;">✓</span> Lista para ser publicada
          </span>
        </div>
      </div>
    </div>

    <!-- Footer Info -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        &copy; ${new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()
}
