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
 * Generate HTML string for booking request email (simplified string-based approach)
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
          Este enlace expirará en 24 horas. Si tiene preguntas, por favor contacte a ${escapeHtml(requesterEmail || 'OfertaSimple')}.
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

/**
 * Generate HTML string for booking confirmation email
 */
export function renderBookedConfirmationEmail(data: {
  eventName: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
  description?: string
}): string {
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

/**
 * Generate HTML string for rejection email
 */
export function renderRejectionEmail(props: {
  requestName: string
  merchant?: string
  rejectionReason: string
}): string {
  const { requestName, merchant, rejectionReason } = props

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
    <div style="background-color: #dc2626; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;">
        Solicitud de Booking Rechazada
      </h1>
      <p style="color: #fecaca; font-size: 14px; margin: 8px 0 0 0;">
        OS Deals Booking - OfertaSimple
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
        Lamentamos informarle que su solicitud de booking ha sido rechazada.
      </p>

      <!-- Request Details -->
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #111827; margin-top: 0; margin-bottom: 12px;">
          Detalles de la Solicitud
        </h2>

        <p style="font-size: 14px; color: #6b7280; margin: 8px 0;">
          <strong>Evento:</strong> ${escapeHtml(requestName)}
        </p>
        ${merchant ? `
        <p style="font-size: 14px; color: #6b7280; margin: 8px 0;">
          <strong>Merchant:</strong> ${escapeHtml(merchant)}
        </p>
        ` : ''}
      </div>

      <!-- Rejection Reason -->
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: bold; color: #dc2626; margin-top: 0; margin-bottom: 12px;">
          Motivo del Rechazo
        </h3>
        <p style="font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap; margin: 0;">
          ${escapeHtml(rejectionReason)}
        </p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
        Si tiene preguntas o desea discutir esta decisión, por favor contacte a nuestro equipo.
      </p>

      <!-- Footer Note -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center;">
        <p style="margin: 0;">
          Para más información, contacte a OfertaSimple.
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

