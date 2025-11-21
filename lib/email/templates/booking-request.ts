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
}

/**
 * Generate HTML string for booking request email
 * This email is sent to the business to approve or reject a booking request
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
  } = props

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

        ${description ? `
        <div style="margin-top: 16px;">
          <p style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Descripción:</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-wrap; margin: 0;">${escapeHtml(description)}</p>
        </div>
        ` : ''}
      </div>

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
        © 2025 OfertaSimple - OS Deals Booking System
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

