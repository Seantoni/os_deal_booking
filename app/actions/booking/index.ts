/**
 * Booking Actions - Domain Barrel
 *
 * Groups all booking-related server actions:
 * - Booking requests (internal)
 * - Public request links
 * - Field comments on booking requests
 *
 * Prefer importing from here for new code:
 *   import { getBookingRequests } from '@/app/actions/booking'
 *   import { generateAndSendPublicLink } from '@/app/actions/booking'
 */

export * from '../booking-requests'
export * from '../public-request-links'
export * from '../field-comments'


