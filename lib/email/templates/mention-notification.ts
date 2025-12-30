/**
 * Mention Notification Email Template
 * 
 * Notifies users when they are mentioned in a marketing option comment
 * Uses OfertaSimple branding
 */

import { getAppBaseUrl } from '@/lib/config/env'

interface MentionNotificationEmailProps {
  mentionedUserName: string
  authorName: string
  content: string
  optionType: string
  platform: string
  businessName: string
  campaignId: string
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Get platform display name
 */
function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    ofertasimple: 'OfertaSimple',
  }
  return labels[platform] || platform
}

/**
 * Get option type display name
 */
function getOptionTypeLabel(optionType: string): string {
  const labels: Record<string, string> = {
    post: 'Post',
    reel: 'Reel',
    story: 'Story',
    video: 'Video',
    ad: 'Ad',
    banner: 'Banner',
    email_banner: 'Email Banner',
  }
  return labels[optionType] || optionType
}

/**
 * Render mention notification email HTML
 */
export function renderMentionNotificationEmail(props: MentionNotificationEmailProps): string {
  const {
    mentionedUserName,
    authorName,
    content,
    optionType,
    platform,
    businessName,
    campaignId,
  } = props

  const appBaseUrl = getAppBaseUrl()
  const marketingUrl = `${appBaseUrl}/marketing`
  const platformLabel = getPlatformLabel(platform)
  const optionLabel = getOptionTypeLabel(optionType)

  // Truncate content if too long
  const truncatedContent = content.length > 300 
    ? content.substring(0, 300) + '...' 
    : content

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Te mencionaron en un comentario</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  
  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        
        <!-- Main Content Table -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 24px 24px 16px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <img src="https://ofertasimple.com/logo-dark.png" alt="OfertaSimple" width="140" style="display: inline-block; max-width: 140px; height: auto;">
            </td>
          </tr>
          
          <!-- Notification Icon -->
          <tr>
            <td align="center" style="padding: 24px 24px 8px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #fef3c7; border-radius: 50%; padding: 12px;">
                    <span style="font-size: 24px;">💬</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td style="padding: 8px 24px 4px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">
                Te mencionaron en un comentario
              </h1>
            </td>
          </tr>
          
          <!-- Subtitle -->
          <tr>
            <td style="padding: 0 24px 16px 24px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ${escapeHtml(authorName)} te mencionó en la opción de marketing
              </p>
            </td>
          </tr>
          
          <!-- Context Info -->
          <tr>
            <td style="padding: 0 24px 16px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Negocio</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 15px; font-weight: 600; color: #111827;">${escapeHtml(businessName)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right: 16px;">
                                <span style="font-size: 12px; color: #6b7280;">Plataforma:</span>
                                <span style="font-size: 12px; font-weight: 600; color: #374151; margin-left: 4px;">${escapeHtml(platformLabel)}</span>
                              </td>
                              <td>
                                <span style="font-size: 12px; color: #6b7280;">Opción:</span>
                                <span style="font-size: 12px; font-weight: 600; color: #374151; margin-left: 4px;">${escapeHtml(optionLabel)}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Comment Content -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0; font-size: 14px; color: #78350f; font-style: italic; line-height: 1.5;">
                      "${escapeHtml(truncatedContent)}"
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #92400e;">
                      — ${escapeHtml(authorName)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 24px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #f97316; border-radius: 8px;">
                    <a href="${marketingUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Ver Comentario
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      Este correo fue enviado porque fuiste mencionado en un comentario.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
                      © ${new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>
              </table>
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

