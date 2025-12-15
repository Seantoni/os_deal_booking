/**
 * Event type definition
 * Represents a calendar event or booking
 */
export type Event = {
  id: string
  name: string
  description: string | null
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
  merchant: string | null
  startDate: Date
  endDate: Date
  status: string // 'pending' | 'approved' | 'pre-booked' | 'booked' | 'rejected'
  userId: string
  bookingRequestId?: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Event status options
 */
export type EventStatus = 'pending' | 'approved' | 'pre-booked' | 'booked' | 'rejected'

