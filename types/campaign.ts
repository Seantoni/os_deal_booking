/**
 * Sales Campaign type definitions
 */

export type SalesCampaign = {
  id: string
  name: string
  runAt: Date | string
  endAt: Date | string
  minBusinesses: number | null
  maxBusinesses: number | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  // Computed/aggregated
  businessCount?: number
  // Relations
  businesses?: BusinessCampaign[]
  creator?: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  } | null
}

export type BusinessCampaign = {
  id: string
  businessId: string
  campaignId: string
  assignedAt: Date | string
  assignedBy: string | null
  // Relations
  business?: {
    id: string
    name: string
    ownerId: string | null
    owner?: {
      id: string
      clerkId: string
      name: string | null
      email: string | null
    } | null
  }
  campaign?: SalesCampaign
  assigner?: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  } | null
}

// Campaign status based on dates
export type CampaignStatus = 'upcoming' | 'active' | 'ended'

export function getCampaignStatus(campaign: { runAt: Date | string; endAt: Date | string }): CampaignStatus {
  const now = new Date()
  const runAt = new Date(campaign.runAt)
  const endAt = new Date(campaign.endAt)
  
  if (now < runAt) return 'upcoming'
  if (now > endAt) return 'ended'
  return 'active'
}

export function isCampaignSelectable(campaign: { runAt: Date | string }): boolean {
  // Only upcoming campaigns can be selected for adding businesses
  const now = new Date()
  const runAt = new Date(campaign.runAt)
  return now < runAt
}
