/**
 * Unified Mention Notification Email Template
 *
 * Notifies users when they are mentioned in comments (marketing or opportunity)
 * Uses OfertaSimple branding
 */

import { getAppBaseUrl } from '@/lib/config/env'
import { 
  renderEmailLayout, 
  renderButton,
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

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
      buttonText: 'Ver Comentario',
      urlPath: '/marketing',
      entityLabel: 'Negocio',
    },
    opportunity: {
      title: 'Te mencionaron en una oportunidad',
      subtitle: 'te mencionó en un comentario',
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

  const emailContent = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="width: 48px; height: 48px; background-color: #f5f5f7; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 24px;">💬</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        ${config.title}
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        <strong>${escapeHtml(authorName)}</strong> ${config.subtitle}
      </p>
    </div>

    <!-- Context Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.05em; margin-bottom: 4px;">
        ${config.entityLabel}
      </div>
      <div style="font-size: 16px; font-weight: 600; color: ${EMAIL_STYLES.colors.text}; margin-bottom: 12px;">
        ${escapeHtml(businessName)}
      </div>

      ${entityType === 'marketing' && optionType && platform ? `
        <div style="display: flex; gap: 16px; font-size: 13px;">
          <div>
            <span style="color: ${EMAIL_STYLES.colors.secondary};">Plataforma:</span>
            <span style="font-weight: 500; color: ${EMAIL_STYLES.colors.text}; margin-left: 4px;">${escapeHtml(getPlatformLabel(platform))}</span>
          </div>
          <div>
            <span style="color: ${EMAIL_STYLES.colors.secondary};">Opción:</span>
            <span style="font-weight: 500; color: ${EMAIL_STYLES.colors.text}; margin-left: 4px;">${escapeHtml(getOptionTypeLabel(optionType))}</span>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Comment Bubble -->
    <div style="position: relative; background-color: #ffffff; border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 12px; padding: 20px; margin-bottom: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
      <div style="font-size: 15px; line-height: 1.6; color: ${EMAIL_STYLES.colors.text}; font-style: italic;">
        "${escapeHtml(truncatedContent)}"
      </div>
      <div style="margin-top: 12px; font-size: 13px; color: ${EMAIL_STYLES.colors.secondary}; text-align: right;">
        — ${escapeHtml(authorName)}
      </div>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center;">
      ${renderButton(config.buttonText, entityUrl, 'primary')}
    </div>
  `

  return renderEmailLayout({
    title: config.title,
    previewText: `${authorName} te mencionó: "${truncatedContent}"`,
    children: emailContent
  })
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
