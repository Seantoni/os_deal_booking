import {
  renderEmailLayout,
  renderKeyValue,
  renderButton,
  renderDivider,
  escapeHtml,
  EMAIL_STYLES,
} from './layout'

interface PublicBookingRequestEmailProps {
  recipientEmail: string
  publicUrl: string
  senderName: string
}

export function renderPublicBookingRequestEmail({
  recipientEmail,
  publicUrl,
  senderName,
}: PublicBookingRequestEmailProps): string {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em; text-align: center;">
      Complete su Solicitud de Booking
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      ${escapeHtml(senderName)} le invitó a completar un formulario externo de booking.
    </p>

    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td colspan="2" style="padding-bottom: 16px;">
            ${renderKeyValue('Invitado por', escapeHtml(senderName), true)}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-bottom: 16px;">
            ${renderKeyValue('Destinatario(s)', escapeHtml(recipientEmail), true)}
          </td>
        </tr>
        <tr>
          <td style="width: 50%; vertical-align: top; padding-bottom: 0;">
            ${renderKeyValue('Acceso', 'Formulario publico', true)}
          </td>
          <td style="width: 50%; vertical-align: top; padding-bottom: 0;">
            ${renderKeyValue('Login requerido', 'No', true)}
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-bottom: 28px;">
      ${renderButton('Acceder al Formulario', publicUrl, 'primary')}
    </div>

    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_STYLES.colors.text}; text-align: center;">
      Use el botón anterior para completar y enviar su solicitud. Este enlace funciona sin iniciar sesión.
    </p>

    ${renderDivider()}

    <div style="padding: 20px 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        ¿El botón no funciona? Use este enlace alternativo:
      </p>
      ${renderButton('Abrir Formulario', publicUrl, 'secondary')}
    </div>

    <div style="margin-top: 16px; font-size: 11px; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Si no esperaba este correo, puede ignorarlo con seguridad.
    </div>
  `

  return renderEmailLayout({
    title: 'Complete su Solicitud de Booking - OfertaSimple',
    previewText: `${senderName} le invito a completar una solicitud de booking`,
    children: content,
  })
}
