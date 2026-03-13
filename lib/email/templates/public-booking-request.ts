import {
  renderEmailLayout,
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
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 40px; line-height: 1;">🎉</div>
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em; text-align: center;">
      ¡Queremos trabajar contigo!
    </h1>
    <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      El equipo de <strong style="color: ${EMAIL_STYLES.colors.text};">OfertaSimple</strong> te invita a publicar tu oferta en nuestra plataforma. Solo necesitamos algunos datos para empezar.
    </p>

    <div style="text-align: center; margin-bottom: 32px;">
      ${renderButton('Completar mi Solicitud', publicUrl, 'primary')}
    </div>

    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px;">
      <p style="margin: 0 0 14px 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${EMAIL_STYLES.colors.secondary};">
        ¿Qué necesitas?
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 0 0 10px 0; font-size: 14px; line-height: 1.5; color: ${EMAIL_STYLES.colors.text};">
            <span style="margin-right: 8px;">📋</span> Datos de tu negocio y oferta
          </td>
        </tr>
        <tr>
          <td style="padding: 0 0 10px 0; font-size: 14px; line-height: 1.5; color: ${EMAIL_STYLES.colors.text};">
            <span style="margin-right: 8px;">🏦</span> Información fiscal y bancaria (RUC, cuenta)
          </td>
        </tr>
        <tr>
          <td style="padding: 0; font-size: 14px; line-height: 1.5; color: ${EMAIL_STYLES.colors.text};">
            <span style="margin-right: 8px;">💰</span> Precios y detalles de lo que quieres ofrecer
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_STYLES.colors.text}; text-align: center;">
      No necesitas crear cuenta ni iniciar sesión.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Enviado por ${escapeHtml(senderName)} desde OfertaSimple
    </p>

    ${renderDivider()}

    <div style="padding: 20px 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        ¿El botón no funciona? Prueba este:
      </p>
      ${renderButton('Abrir Formulario', publicUrl, 'secondary')}
    </div>

    <div style="margin-top: 16px; font-size: 11px; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Si no esperabas este correo, puedes ignorarlo.
    </div>
  `

  return renderEmailLayout({
    title: '¡Queremos trabajar contigo! - OfertaSimple',
    previewText: 'OfertaSimple te invita a publicar tu oferta. Completa tu solicitud en minutos.',
    children: content,
  })
}
