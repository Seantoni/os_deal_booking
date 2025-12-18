interface AdminApprovalEmailProps {
  requestName: string
  businessName: string
  businessEmail: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
  approvedByName: string
  approvedByEmail: string
  recipientType: 'business' | 'creator'
}

/**
 * Generate HTML string for admin approval notification email
 * Sent to both business and creator when admin approves directly
 */
export function renderAdminApprovalEmail(props: AdminApprovalEmailProps): string {
  const {
    requestName,
    businessName,
    businessEmail,
    merchant,
    category,
    startDate,
    endDate,
    approvedByName,
    approvedByEmail,
    recipientType,
  } = props

  const escapeHtml = (text: string | undefined | null) => {
    if (!text) return ''
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const recipientMessage = recipientType === 'business'
    ? 'Su solicitud de booking ha sido <strong style="color: #10b981;">aprobada internamente</strong> por el equipo de OfertaSimple.'
    : 'La solicitud de booking ha sido <strong style="color: #10b981;">aprobada internamente</strong>.'

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud Aprobada - OfertaSimple</title>
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
            <td align="center" style="background-color: #ffffff; padding: 20px 30px; border-bottom: 3px solid #10b981;">
              <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2075.png?_t=1743086513" alt="OfertaSimple" width="180" style="display: block; border: 0; max-width: 180px; width: 180px;" />
            </td>
          </tr>

          <!-- Main Title Area -->
          <tr>
            <td align="center" style="background-color: #ecfdf5; padding: 40px 30px;">
              <div style="width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; color: #ffffff;">✓</span>
              </div>
              <h1 style="margin: 0 0 10px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1.3;">
                Solicitud Aprobada
              </h1>
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #4b5563; font-size: 16px; line-height: 1.5;">
                ${recipientMessage}
              </p>
            </td>
          </tr>

          <!-- Approval Details Box -->
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

                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 15px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Negocio</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">${escapeHtml(businessName)}</div>
                        </td>
                      </tr>
                      ${category ? `
                      <tr>
                        <td style="padding-bottom: 15px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Categoría</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">${escapeHtml(category)}</div>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding-bottom: 15px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Fecha de Inicio</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">${escapeHtml(startDate)}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 15px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Fecha de Finalización</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">${escapeHtml(endDate)}</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Admin Approval Info -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #166534; text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Aprobada por Administrador de OfertaSimple</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #15803d; font-weight: 600;">${escapeHtml(approvedByName)}</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #22c55e;">${escapeHtml(approvedByEmail)}</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Status Badge -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 25px;">
                      <tr>
                        <td align="center" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px;">
                          <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #059669; font-weight: 600; font-size: 14px; display: inline-block;">
                            ✓ Aprobada - Lista para ser programada
                          </span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Note for business -->
          ${recipientType === 'business' ? `
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;">
                <tr>
                  <td style="padding: 15px;">
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #92400e; line-height: 1.5;">
                      <strong>Nota:</strong> Esta solicitud fue aprobada internamente por el equipo de OfertaSimple. 
                      Si recibió anteriormente un correo con botones de aprobación/rechazo, ya no es necesario utilizarlos.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

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

