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
}

/**
 * Booking request status options for select dropdowns
 */
export const BOOKING_REQUEST_STATUS_OPTIONS = BOOKING_REQUEST_STATUS_VALUES.map(status => ({
  value: status,
  label: BOOKING_REQUEST_STATUS_LABELS[status],
}))

