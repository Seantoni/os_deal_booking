/**
 * Business and Opportunity type definitions
 */

import type { OpportunityStage } from '@/lib/constants'

export type Business = {
  id: string
  name: string
  contactName: string
  contactPhone: string
  contactEmail: string
  categoryId: string | null
  ownerId: string | null
  salesTeam: string | null
  website: string | null
  instagram: string | null
  description: string | null
  tier: number | null
  sourceType?: string | null
  metrics?: {
    net_rev_360_days?: number
    total_vouchers?: number
    total_deals?: number
    last_deal_id?: string
    last_deal_link?: string
  } | null
  createdAt: Date
  updatedAt: Date
  // Extended profile
  ruc?: string | null
  razonSocial?: string | null
  province?: string | null
  district?: string | null
  corregimiento?: string | null
  naOs?: boolean | null
  accountManager?: string | null
  ere?: string | null
  paymentPlan?: string | null
  bank?: string | null
  beneficiaryName?: string | null
  accountNumber?: string | null
  accountType?: string | null
  emailPaymentContacts?: string | null
  address?: string | null
  neighborhood?: string | null
  salesType?: string | null
  isAsesor?: string | null
  osAsesor?: string | null
  // External IDs
  osAdminVendorId?: string | null
  // Focus state
  focusPeriod?: string | null
  focusSetAt?: Date | string | null
  // Deal metrics aggregates (denormalized from DealMetrics)
  topSoldQuantity?: number | null
  topSoldDealUrl?: string | null
  topRevenueAmount?: number | string | null // Decimal from Prisma can be string
  topRevenueDealUrl?: string | null
  lastLaunchDate?: Date | string | null
  totalDeals360d?: number | null
  metricsLastSyncedAt?: Date | string | null
  // Reassignment tracking
  reassignmentStatus?: string | null // null (normal), 'pending_reassign', 'pending_removal'
  reassignmentType?: 'reasignar' | 'sacar' | null
  reassignmentRequestedBy?: string | null // clerkId of who requested
  reassignmentRequestedAt?: Date | string | null
  reassignmentReason?: string | null
  reassignmentPreviousOwner?: string | null // to restore if cancelled
  reassignmentRequester?: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  } | null
  // Relations
  category?: {
    id: string
    categoryKey: string
    parentCategory: string
    subCategory1: string | null
    subCategory2: string | null
  } | null
  salesReps?: {
    id: string
    salesRepId: string
    salesRep: {
      id: string
      clerkId: string
      name: string | null
      email: string | null
    }
  }[]
  owner?: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  } | null
}

export type Opportunity = {
  id: string
  businessId: string
  name: string | null
  stage: OpportunityStage
  startDate: Date
  closeDate: Date | null
  notes: string | null
  lostReason: string | null
  userId: string
  responsibleId: string | null
  nextActivityDate: Date | null
  lastActivityDate: Date | null
  hasRequest: boolean
  bookingRequestId: string | null
  createdAt: Date
  updatedAt: Date
  // Relations
  business?: Business
  tasks?: Task[]
  responsible?: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  } | null
}

export type Task = {
  id: string
  opportunityId: string
  category: 'meeting' | 'todo'
  title: string
  date: Date
  completed: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

