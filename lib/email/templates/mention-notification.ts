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
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, h1, h2, h3, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">

  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">

        <!-- Main Content Table -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08); overflow: hidden;">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #e84c0f; border-bottom: 3px solid #c2410c;">
              <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/OFS_Marca_Blanco_02.png?_t=1754077435" alt="OfertaSimple" width="180" style="display: inline-block; max-width: 180px; height: auto;">
            </td>
          </tr>

          <!-- Notification Icon -->
          <tr>
            <td align="center" style="padding: 24px 24px 8px 24px; background-color: #f8fafc;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: ${config.iconBg}; border-radius: 50%; padding: 12px;">
                    <span style="font-size: 22px;">${config.icon}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 8px 24px 4px 24px; text-align: center; background-color: #f8fafc;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">
                ${config.title}
              </h1>
            </td>
          </tr>

          <!-- Subtitle -->
          <tr>
            <td style="padding: 0 24px 18px 24px; text-align: center; background-color: #f8fafc;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ${escapeHtml(authorName)} ${config.subtitle}
              </p>
            </td>
          </tr>

          <!-- Context Info -->
          <tr>
            <td style="padding: 0 24px 16px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 14px 16px;">
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
                  <td style="background-color: ${config.accentColor}; border-radius: 8px;">
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
