/**
 * Booking request type definition
 * Represents a request to book an event that needs approval
 */
export type BookingRequest = {
  id: string
  name: string
  description: string | null
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  merchant: string | null
  businessEmail: string
  startDate: Date
  endDate: Date
  status: string // 'draft' | 'pending' | 'approved' | 'booked' | 'rejected'
  eventId: string | null
  userId: string
  processedAt: Date | null
  processedBy: string | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Booking request status options
 */
export type BookingRequestStatus = 'draft' | 'pending' | 'approved' | 'booked' | 'rejected'

