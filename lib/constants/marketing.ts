/**
 * Marketing Constants
 * Configuration for marketing platforms and options
 */

// Marketing platforms available
export const MARKETING_PLATFORMS = ['instagram', 'tiktok', 'ofertasimple'] as const
export type MarketingPlatform = (typeof MARKETING_PLATFORMS)[number]

// Option types per platform
export const MARKETING_OPTION_TYPES = {
  instagram: ['story', 'reel', 'post'] as const,
  tiktok: ['video', 'story'] as const,
  ofertasimple: ['ad', 'banner', 'email_banner', 'push_notification'] as const,
} as const

export type MarketingOptionType = 
  | (typeof MARKETING_OPTION_TYPES.instagram)[number]
  | (typeof MARKETING_OPTION_TYPES.tiktok)[number]
  | (typeof MARKETING_OPTION_TYPES.ofertasimple)[number]

// Marketing options configuration with labels
export const MARKETING_OPTIONS_CONFIG = {
  instagram: {
    label: 'Instagram',
    icon: 'Instagram',
    options: [
      { type: 'story', label: 'Story' },
      { type: 'reel', label: 'Reel' },
      { type: 'post', label: 'Post' },
    ],
  },
  tiktok: {
    label: 'TikTok',
    icon: 'TikTok',
    options: [
      { type: 'video', label: 'Video' },
      { type: 'story', label: 'Story' },
    ],
  },
  ofertasimple: {
    label: 'OfertaSimple',
    icon: 'OfertaSimple',
    options: [
      { type: 'ad', label: 'Ad' },
      { type: 'banner', label: 'Banner' },
      { type: 'email_banner', label: 'Email Banner' },
      { type: 'push_notification', label: 'Push Notification' },
    ],
  },
} as const

