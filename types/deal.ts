/**
 * Deal type definition
 * Represents a deal created from a booked booking request
 */
import type { DealStatus } from '@/lib/constants'

export type Deal = {
  id: string
  bookingRequestId: string
  responsibleId: string | null
  ereResponsibleId: string | null
  status: DealStatus
  createdAt: Date
  updatedAt: Date
  bookingRequest: {
    id: string
    name: string
    businessEmail: string
    startDate: Date
    endDate: Date
    status: string
    parentCategory: string | null
    subCategory1: string | null
    subCategory2: string | null
    processedAt: Date | null
    description: string | null
    // Additional fields for enhanced display
    merchant: string | null
    sourceType: string | null
    redemptionContactName: string | null
    redemptionContactEmail: string | null
    redemptionContactPhone: string | null
    legalName: string | null
    rucDv: string | null
    commission: string | null
    paymentType: string | null
    businessReview: string | null
    offerDetails: string | null
    campaignDuration: string | null
    redemptionMode: string | null
    addressAndHours: string | null
    bank: string | null
    accountNumber: string | null
    pricingOptions: any | null
  }
  responsible?: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  } | null
  ereResponsible?: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  } | null
  opportunityResponsible?: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  } | null
}

