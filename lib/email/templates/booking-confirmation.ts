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
 */
export function renderBookingConfirmationEmail(data: BookingConfirmationEmailProps): string {
  const { eventName, merchant, category, startDate, endDate, description } = data
  
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
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center">
      <div style="background-color: rgba(255, 255, 255, 0.2); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center">
        <svg style="width: 36px; height: 36px; color: #ffffff" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0">¡Reserva Confirmada!</h1>
      <p style="color: #d1fae5; font-size: 14px; margin: 12px 0 0 0">OS Deals Booking - OfertaSimple</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px">
      <p style="font-size: 16px; color: #374151; margin-bottom: 24px">
        Su reserva ha sido confirmada exitosamente. A continuación los detalles:
      </p>

      <!-- Booking Details -->
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #10b981">
        <h2 style="font-size: 18px; font-weight: bold; color: #111827; margin-top: 0; margin-bottom: 16px">Detalles de la Reserva</h2>
        <table style="width: 100%; border-collapse: collapse">
          <tbody>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600; width: 140px">Nombre del Evento:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: bold">${escapeHtml(eventName)}</td>
            </tr>
            ${merchant ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600">Merchant/Aliado:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827">${escapeHtml(merchant)}</td>
            </tr>
            ` : ''}
            ${category ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600">Categoría:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827">${escapeHtml(category)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600">Fecha de Inicio:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600">${startDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600">Fecha de Fin:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600">${endDate}</td>
            </tr>
          </tbody>
        </table>
        ${description ? `
        <div style="margin-top: 16px">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px">Descripción:</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-wrap; margin: 0">${escapeHtml(description)}</p>
        </div>
        ` : ''}
      </div>

      <!-- Success Message -->
      <div style="background-color: #d1fae5; border-radius: 6px; padding: 16px; margin-bottom: 24px; border: 1px solid #10b981">
        <p style="font-size: 14px; color: #065f46; margin: 0; text-align: center">
          ✓ La reserva ha sido registrada en el sistema y está lista para publicación.
        </p>
      </div>

      <!-- Footer Info -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; text-align: center">
        <p style="margin: 0">Si tiene alguna pregunta, por favor contacte al equipo de OfertaSimple.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb">
      <p style="font-size: 12px; color: #9ca3af; margin: 0">© 2025 OfertaSimple - OS Deals Booking System</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

