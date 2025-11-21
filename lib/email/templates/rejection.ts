interface RejectionEmailProps {
  requestName: string
  merchant?: string
  rejectionReason: string
}

/**
 * Generate HTML string for rejection email
 * This email is sent when a booking request is rejected
 */
export function renderRejectionEmail(props: RejectionEmailProps): string {
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

