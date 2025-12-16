interface RejectionEmailProps {
  requestName: string
  merchant?: string
  rejectionReason: string
}

/**
 * Generate HTML string for rejection email
 * Optimized for cross-client compatibility (Outlook, Gmail, etc.)
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
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud Rechazada - OfertaSimple</title>
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
            <td align="center" style="background-color: #ffffff; padding: 20px 30px; border-bottom: 3px solid #e84c0f;">
              <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2075.png?_t=1743086513" alt="OfertaSimple" width="180" style="display: block; border: 0; max-width: 180px; width: 180px;" />
            </td>
          </tr>

          <!-- Main Title Area -->
          <tr>
            <td align="center" style="background-color: #fef2f2; padding: 40px 30px;">
              <h1 style="margin: 0 0 10px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #dc2626; font-size: 24px; font-weight: 700; line-height: 1.3;">
                Solicitud Rechazada
              </h1>
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #7f1d1d; font-size: 16px; line-height: 1.5;">
                La solicitud de booking para <strong>${escapeHtml(requestName)}</strong> no ha sido aprobada.
              </p>
            </td>
          </tr>

          <!-- Details Box -->
          <tr>
            <td style="padding: 0 30px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; margin-top: -20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 30px;">
                    
                    <div style="margin-bottom: 25px; border-bottom: 1px solid #f3f4f6; padding-bottom: 20px;">
                      <h2 style="margin: 0 0 5px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 20px; color: #111827; font-weight: 700;">
                        ${escapeHtml(requestName)}
                      </h2>
                      ${merchant ? `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #6b7280; font-size: 14px;">Merchant/Aliado: ${escapeHtml(merchant)}</div>` : ''}
                    </div>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff5f5; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 10px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; text-transform: uppercase; color: #b91c1c; letter-spacing: 0.5px;">
                            Motivo del Rechazo
                          </h3>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #450a0a; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(rejectionReason)}</div>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top: 25px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.5; text-align: center;">
                      Si tiene preguntas o desea discutir esta decisión, por favor contacte al equipo de aprobaciones.
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Branding -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.
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
