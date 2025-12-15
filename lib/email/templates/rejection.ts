interface RejectionEmailProps {
  requestName: string
  merchant?: string
  rejectionReason: string
}

/**
 * Generate HTML string for rejection email
 * Optimized for readability and clarity with OfertaSimple branding
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud Rechazada - OfertaSimple</title>
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
    <div style="background-color: #fef2f2; padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0 0 10px 0; color: #dc2626; font-size: 24px; font-weight: 700; line-height: 1.3;">
        Solicitud Rechazada
      </h1>
      <p style="margin: 0; color: #7f1d1d; font-size: 16px; line-height: 1.5;">
        La solicitud de booking para <strong>${escapeHtml(requestName)}</strong> no ha sido aprobada.
      </p>
    </div>

    <!-- Details Box -->
    <div style="padding: 0 30px 40px 30px;">
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; margin-top: -20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <div style="margin-bottom: 25px; border-bottom: 1px solid #f3f4f6; padding-bottom: 20px;">
          <h2 style="margin: 0 0 5px 0; font-size: 20px; color: #111827; font-weight: 700;">
            ${escapeHtml(requestName)}
          </h2>
          ${merchant ? `<div style="color: #6b7280; font-size: 14px;">Merchant/Aliado: ${escapeHtml(merchant)}</div>` : ''}
        </div>

        <div style="background-color: #fff5f5; border-left: 4px solid #ef4444; padding: 20px; border-radius: 0 8px 8px 0;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #b91c1c; letter-spacing: 0.5px;">
            Motivo del Rechazo
          </h3>
          <div style="font-size: 15px; color: #450a0a; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(rejectionReason)}</div>
        </div>

        <div style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.5; text-align: center;">
          Si tiene preguntas o desea discutir esta decisión, por favor contacte al equipo de aprobaciones.
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
