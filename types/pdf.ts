/**
 * PDF parsing type definitions
 */

export type ParsedBookingData = {
  name?: string
  businessName?: string
  businessEmail?: string
  category?: string
  parentCategory?: string
  subCategory1?: string
  subCategory2?: string
  subCategory3?: string
  serviceProduct?: string
  description?: string
  merchant?: string
  discount?: string
  notes?: string
  suggestedStartDate?: string // Format: YYYY-MM-DD
  suggestedEndDate?: string // Format: YYYY-MM-DD
  totalDays?: number
}

