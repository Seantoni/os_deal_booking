interface BookingConfirmationEmailProps {
  eventName: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
}

/**
 * Generate HTML string for booking confirmation email
 * Optimized for cross-client compatibility (Outlook, Gmail, etc.)
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
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reserva Confirmada - OfertaSimple</title>
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
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #e84c0f; padding: 20px 30px; border-bottom: 3px solid #c2410c;">
              <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/OFS_Marca_Blanco_02.png?_t=1754077435" alt="OfertaSimple" width="180" style="display: block; border: 0; max-width: 180px; width: 180px;" />
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 28px 30px;">
              <div style="width: 48px; height: 48px; background-color: #16a34a; border-radius: 50%; margin: 0 auto 12px auto; display: block; text-align: center; line-height: 48px; color: #ffffff; font-size: 22px; font-weight: 700;">
                ✓
              </div>
              <h1 style="margin: 0 0 8px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #16a34a; font-size: 22px; font-weight: 700; line-height: 1.3;">
                Reserva Confirmada
              </h1>
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #4b5563; font-size: 15px; line-height: 1.5;">
                La reserva para <strong>${escapeHtml(eventName)}</strong> ha sido confirmada exitosamente.
              </p>
            </td>
          </tr>

          <!-- Summary Card -->
          <tr>
            <td style="padding: 0 30px 28px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; margin-top: -12px; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);">
                <tr>
                  <td style="padding: 24px;">
                    <div style="margin-bottom: 18px; border-left: 4px solid #e84c0f; padding-left: 10px;">
                      <h2 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; color: #111827; font-weight: 700;">
                        Resumen de la Reserva
                      </h2>
                    </div>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Evento / Campaña</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #111827; font-weight: 600;">${escapeHtml(eventName)}</div>
                        </td>
                      </tr>
                      ${merchant ? `
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Merchant / Aliado</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">${escapeHtml(merchant)}</div>
                        </td>
                      </tr>
                      ` : ''}
                      ${category ? `
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Categoría</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">${escapeHtml(category)}</div>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td width="50%" style="padding-right: 6px;">
                                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Fecha de Inicio</div>
                                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">${escapeHtml(startDate)}</div>
                              </td>
                              <td width="50%" style="padding-left: 6px;">
                                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Fecha de Finalización</div>
                                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">${escapeHtml(endDate)}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Status Badge -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 18px;">
                      <tr>
                        <td align="center" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px;">
                          <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #059669; font-weight: 600; font-size: 13px; display: inline-block;">
                            Lista para ser publicada
                          </span>
                        </td>
                      </tr>
                    </table>

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
