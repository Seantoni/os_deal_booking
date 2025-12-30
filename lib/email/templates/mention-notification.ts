/**
 * Unified Mention Notification Email Template
 * 
 * Notifies users when they are mentioned in comments (marketing or opportunity)
 * Uses OfertaSimple branding
 */

import { getAppBaseUrl } from '@/lib/config/env'

// Entity types supported
export type MentionEntityType = 'marketing' | 'opportunity'

interface MentionNotificationEmailProps {
  mentionedUserName: string
  authorName: string
  content: string
  entityType: MentionEntityType
  entityId: string
  businessName: string
  // Marketing-specific (optional)
  optionType?: string
  platform?: string
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
 * Get configuration based on entity type
 */
function getEntityConfig(entityType: MentionEntityType) {
  const configs = {
    marketing: {
      title: 'Te mencionaron en un comentario',
      subtitle: 'te mencionó en la opción de marketing',
      icon: '💬',
      iconBg: '#fef3c7',
      accentColor: '#f59e0b',
      quoteBg: '#fffbeb',
      quoteText: '#78350f',
      quoteAuthor: '#92400e',
      buttonText: 'Ver Comentario',
      urlPath: '/marketing',
      entityLabel: 'Negocio',
    },
    opportunity: {
      title: 'Te mencionaron en una oportunidad',
      subtitle: 'te mencionó en un comentario',
      icon: '🤝',
      iconBg: '#fed7aa',
      accentColor: '#f97316',
      quoteBg: '#fff7ed',
      quoteText: '#9a3412',
      quoteAuthor: '#c2410c',
      buttonText: 'Ver Oportunidad',
      urlPath: '/opportunities',
      entityLabel: 'Oportunidad',
    },
  }
  return configs[entityType]
}

/**
 * Render mention notification email HTML
 */
export function renderMentionNotificationEmail(props: MentionNotificationEmailProps): string {
  const {
    mentionedUserName,
    authorName,
    content,
    entityType,
    entityId,
    businessName,
    optionType,
    platform,
  } = props

  const config = getEntityConfig(entityType)
  const appBaseUrl = getAppBaseUrl()
  const entityUrl = `${appBaseUrl}${config.urlPath}`

  // Truncate content if too long
  const truncatedContent = content.length > 300 
    ? content.substring(0, 300) + '...' 
    : content

  // Build marketing-specific context section
  const marketingContext = entityType === 'marketing' && optionType && platform ? `
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right: 16px;">
              <span style="font-size: 12px; color: #6b7280;">Plataforma:</span>
              <span style="font-size: 12px; font-weight: 600; color: #374151; margin-left: 4px;">${escapeHtml(getPlatformLabel(platform))}</span>
            </td>
            <td>
              <span style="font-size: 12px; color: #6b7280;">Opción:</span>
              <span style="font-size: 12px; font-weight: 600; color: #374151; margin-left: 4px;">${escapeHtml(getOptionTypeLabel(optionType))}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : ''

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
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
                  <td style="background-color: ${config.iconBg}; border-radius: 50%; padding: 12px;">
                    <span style="font-size: 24px;">${config.icon}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td style="padding: 8px 24px 4px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">
                ${config.title}
              </h1>
            </td>
          </tr>
          
          <!-- Subtitle -->
          <tr>
            <td style="padding: 0 24px 16px 24px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ${escapeHtml(authorName)} ${config.subtitle}
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
                          <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${config.entityLabel}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: ${marketingContext ? '12px' : '0'};">
                          <span style="font-size: 15px; font-weight: 600; color: #111827;">${escapeHtml(businessName)}</span>
                        </td>
                      </tr>
                      ${marketingContext}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Comment Content -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${config.quoteBg}; border-radius: 8px; border-left: 4px solid ${config.accentColor};">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0; font-size: 14px; color: ${config.quoteText}; font-style: italic; line-height: 1.5;">
                      "${escapeHtml(truncatedContent)}"
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: ${config.quoteAuthor};">
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
                    <a href="${entityUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      ${config.buttonText}
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

// Legacy export for backward compatibility with marketing mentions
export function renderMarketingMentionNotificationEmail(props: {
  mentionedUserName: string
  authorName: string
  content: string
  optionType: string
  platform: string
  businessName: string
  campaignId: string
}): string {
  return renderMentionNotificationEmail({
    ...props,
    entityType: 'marketing',
    entityId: props.campaignId,
  })
}

// Legacy export for backward compatibility with opportunity mentions
export function renderOpportunityMentionNotificationEmail(props: {
  mentionedUserName: string
  authorName: string
  content: string
  opportunityId: string
  businessName: string
}): string {
  return renderMentionNotificationEmail({
    ...props,
    entityType: 'opportunity',
    entityId: props.opportunityId,
  })
}
