/**
 * Booking Request Status Constants
 * Centralized constants for booking request status values
 */

export const BOOKING_REQUEST_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  BOOKED: 'booked',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const

export type BookingRequestStatus = typeof BOOKING_REQUEST_STATUSES[keyof typeof BOOKING_REQUEST_STATUSES]

/**
 * Array of all booking request status values (for iteration)
 */
export const BOOKING_REQUEST_STATUS_VALUES: BookingRequestStatus[] = [
  BOOKING_REQUEST_STATUSES.DRAFT,
  BOOKING_REQUEST_STATUSES.PENDING,
  BOOKING_REQUEST_STATUSES.APPROVED,
  BOOKING_REQUEST_STATUSES.BOOKED,
  BOOKING_REQUEST_STATUSES.REJECTED,
  BOOKING_REQUEST_STATUSES.CANCELLED,
]

/**
 * Booking request status labels for UI display
 */
export const BOOKING_REQUEST_STATUS_LABELS: Record<BookingRequestStatus, string> = {
  [BOOKING_REQUEST_STATUSES.DRAFT]: 'Draft',
  [BOOKING_REQUEST_STATUSES.PENDING]: 'Pending',
  [BOOKING_REQUEST_STATUSES.APPROVED]: 'Approved',
  [BOOKING_REQUEST_STATUSES.BOOKED]: 'Booked',
  [BOOKING_REQUEST_STATUSES.REJECTED]: 'Rejected',
  [BOOKING_REQUEST_STATUSES.CANCELLED]: 'Cancelled',
}

/**
 * Booking request status options for select dropdowns
 */
export const BOOKING_REQUEST_STATUS_OPTIONS = BOOKING_REQUEST_STATUS_VALUES.map(status => ({
  value: status,
  label: BOOKING_REQUEST_STATUS_LABELS[status],
}))

/**
 * Alias for backward compatibility - REQUEST_STATUS_LABELS
 */
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  booked: 'Booked',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

/**
 * Request status colors for pipeline UI
 */
export const REQUEST_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  booked: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  cancelled: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
}

