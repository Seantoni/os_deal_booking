/**
 * Booking request type definition
 * Represents a request to book an event that needs approval
 */
import type { BookingRequestStatus } from '@/lib/constants'
import type { AdditionalRedemptionContact } from '@/lib/booking-requests/additional-redemption-contacts'

export type BookingRequest = {
  id: string
  name: string
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
  merchant: string | null
  businessEmail: string
  startDate: Date
  endDate: Date
  eventDays: string[] | null
  additionalRedemptionContacts?: AdditionalRedemptionContact[] | null
  status: BookingRequestStatus
  sentAt?: Date | null
  approvedAt?: Date | null
  bookedAt?: Date | null
  rejectedAt?: Date | null
  cancelledAt?: Date | null
  eventId: string | null
  businessId: string | null
  opportunityId: string | null
  dealId: string | null
  userId: string
  processedAt: Date | null
  processedBy: string | null
  rejectionReason: string | null
  sourceType: string // 'internal' | 'public_link' | 'vendor_reactivation'
  isReplicatedRequest: boolean
  originExternalDealId?: string | null
  originExternalDealName?: string | null
  publicLinkToken: string | null
  createdAt: Date
  updatedAt: Date
}

// BookingRequestStatus is now exported from @/lib/constants
