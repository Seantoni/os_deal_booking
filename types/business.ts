/**
 * Business and Opportunity type definitions
 */

import type { OpportunityStage } from '@/lib/constants'
import type {
  CategoryRef,
  DateLike,
  DecimalLike,
  Nullable,
  UserRef,
} from './shared'

export type BusinessExternalMetrics = {
  net_rev_360_days?: number
  total_vouchers?: number
  total_deals?: number
  last_deal_id?: string
  last_deal_link?: string
}

export type BusinessCore = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export type BusinessContact = {
  contactName: string
  contactPhone: string
  contactEmail: string
}

export type BusinessClassification = {
  categoryId: Nullable<string>
  tier: Nullable<number>
  description: Nullable<string>
  sourceType?: Nullable<string>
}

export type BusinessAssignment = {
  ownerId: Nullable<string>
  salesTeam: Nullable<string>
  accountManager?: Nullable<string>
  ere?: Nullable<string>
}

export type BusinessOnlinePresence = {
  website: Nullable<string>
  instagram: Nullable<string>
}

export type BusinessLegal = {
  ruc?: Nullable<string>
  razonSocial?: Nullable<string>
  provinceDistrictCorregimiento?: Nullable<string>
  naOs?: Nullable<boolean>
}

export type BusinessLocation = {
  address?: Nullable<string>
  neighborhood?: Nullable<string>
}

export type BusinessBanking = {
  paymentPlan?: Nullable<string>
  bank?: Nullable<string>
  beneficiaryName?: Nullable<string>
  accountNumber?: Nullable<string>
  accountType?: Nullable<string>
  emailPaymentContacts?: Nullable<string>
}

export type BusinessSales = {
  salesType?: Nullable<string>
  isAsesor?: Nullable<string>
  osAsesor?: Nullable<string>
}

export type BusinessExternalIds = {
  osAdminVendorId?: Nullable<string>
}

export type BusinessFocus = {
  focusPeriod?: Nullable<string>
  focusSetAt?: Nullable<DateLike>
}

export type BusinessMetrics = {
  metrics?: Nullable<BusinessExternalMetrics>
  topSoldQuantity?: Nullable<number>
  topSoldDealUrl?: Nullable<string>
  topRevenueAmount?: Nullable<DecimalLike>
  topRevenueDealUrl?: Nullable<string>
  lastLaunchDate?: Nullable<DateLike>
  totalDeals360d?: Nullable<number>
  metricsLastSyncedAt?: Nullable<DateLike>
}

export type BusinessReassignment = {
  reassignmentStatus?: Nullable<string>
  reassignmentType?: 'reasignar' | 'sacar' | null
  reassignmentRequestedBy?: Nullable<string>
  reassignmentRequestedAt?: Nullable<DateLike>
  reassignmentReason?: Nullable<string>
  reassignmentPreviousOwner?: Nullable<string>
  reassignmentRequester?: Nullable<UserRef>
}

export type BusinessRelations = {
  category?: Nullable<CategoryRef>
  owner?: Nullable<UserRef>
}

export type Business =
  & BusinessCore
  & BusinessContact
  & BusinessClassification
  & BusinessAssignment
  & BusinessOnlinePresence
  & BusinessLegal
  & BusinessLocation
  & BusinessBanking
  & BusinessSales
  & BusinessExternalIds
  & BusinessFocus
  & BusinessMetrics
  & BusinessReassignment
  & BusinessRelations

export type Opportunity = {
  id: string
  businessId: string
  categoryId: string | null
  tier: number | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
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
