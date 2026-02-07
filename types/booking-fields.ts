/**
 * Centralized Booking Field Definitions
 * 
 * This file serves as the SINGLE SOURCE OF TRUTH for all fields that flow between:
 * - RequestForm (EnhancedBookingForm, PublicBookingForm)
 * - BookingRequest (database model)
 * - EventModal (when creating events from requests)
 * - PendingRequestsSidebar (display)
 * 
 * When adding new fields, update this file FIRST, then update the consuming components.
 */

import type { BookingRequest } from './booking-request'

// ============================================================================
// CORE FIELD DEFINITIONS
// ============================================================================

/**
 * Category fields - used across all booking-related components
 */
export type CategoryFields = {
  category: string | null        // Full category key (e.g., "RESTAURANTES:Cafeterías:Café")
  parentCategory: string | null  // Main category (e.g., "RESTAURANTES")
  subCategory1: string | null    // First subcategory (e.g., "Cafeterías")
  subCategory2: string | null    // Second subcategory (e.g., "Café")
  subCategory3: string | null    // Third subcategory (rarely used)
}

/**
 * Basic booking identification fields
 */
export type BookingIdentificationFields = {
  name: string                   // Business/event name
  merchant: string | null        // Merchant/partner name
  businessEmail: string          // Contact email
}

/**
 * Date range fields
 */
export type BookingDateFields = {
  startDate: Date | string       // Campaign start date
  endDate: Date | string         // Campaign end date
}

/**
 * Contact information fields
 */
export type ContactFields = {
  redemptionContactName: string | null
  redemptionContactEmail: string | null
  redemptionContactPhone: string | null
}

/**
 * Legal and banking fields
 */
export type LegalBankingFields = {
  legalName: string | null
  rucDv: string | null
  bankAccountName: string | null
  bank: string | null
  accountNumber: string | null
  accountType: string | null
}

/**
 * Operational fields
 */
export type OperationalFields = {
  campaignDuration: string | null
  redemptionMode: string | null
  isRecurring: string | null
  recurringOfferLink: string | null
  paymentType: string | null
  paymentInstructions: string | null
}

/**
 * Business rules fields
 */
export type BusinessRulesFields = {
  includesTaxes: string | null
  validOnHolidays: string | null
  hasExclusivity: string | null
  blackoutDates: string | null
  exclusivityCondition: string | null
  hasOtherBranches: string | null
}

/**
 * Description and content fields
 */
export type DescriptionFields = {
  description: string | null
  businessReview: string | null
  contactDetails: string | null
  socialMedia: string | null
  addressAndHours: string | null
}

// ============================================================================
// EVENT MODAL DATA STRUCTURE
// ============================================================================

/**
 * Data structure passed to EventModal when creating/editing events
 * This is the canonical format for event modal pre-fill data
 */
export type EventModalPrefillData = {
  // Identification
  name: string
  businessName: string           // Alias for name (for compatibility)
  merchant: string
  businessEmail: string
  
  // Category (structured)
  category: string
  parentCategory: string
  subCategory1: string
  subCategory2: string
  subCategory3: string
  
  // Dates (string format: YYYY-MM-DD)
  suggestedStartDate: string
  suggestedEndDate: string
  
  // Content
  description: string
  
  // Reference to source booking request
  bookingRequestId?: string
}

// ============================================================================
// MAPPING UTILITIES
// ============================================================================

/**
 * Format a Date object to YYYY-MM-DD string for form inputs
 */
export function formatDateForInput(date: Date | string): string {
  if (typeof date === 'string') {
    // If already a string, try to parse and reformat
    const parsed = new Date(date)
    if (isNaN(parsed.getTime())) return date
    date = parsed
  }
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Maps a BookingRequest to EventModalPrefillData
 * 
 * This is the SINGLE place where BookingRequest → EventModal mapping happens.
 * Use this function in:
 * - EventsPageClient.handleRequestClick
 * - Any other place that needs to open EventModal with booking request data
 * 
 * @param request - The BookingRequest from the database
 * @returns EventModalPrefillData ready for EventModal consumption
 */
export function mapBookingRequestToEventData(request: BookingRequest): EventModalPrefillData {
  return {
    // Identification - use name for both fields for consistency
    name: request.name,
    businessName: request.name,
    merchant: request.merchant || '',
    businessEmail: request.businessEmail,
    
    // Category - ensure all fields are strings (empty string if null)
    category: request.category || '',
    parentCategory: request.parentCategory || '',
    subCategory1: request.subCategory1 || '',
    subCategory2: request.subCategory2 || '',
    subCategory3: request.subCategory3 || '',
    
    // Dates - convert to YYYY-MM-DD format
    suggestedStartDate: formatDateForInput(request.startDate),
    suggestedEndDate: formatDateForInput(request.endDate),
    
    // Content - BookingRequest no longer has description, use empty string
    description: '',
    
    // Reference to source
    bookingRequestId: request.id,
  }
}

/**
 * Builds a display string for category (e.g., "Restaurantes > Cafeterías > Café")
 */
export function buildCategoryDisplayString(fields: Partial<CategoryFields>): string {
  const formatName = (name: string) => {
    if (!name) return name
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }
  
  if (fields.parentCategory) {
    const parts = [formatName(fields.parentCategory)]
    if (fields.subCategory1) parts.push(formatName(fields.subCategory1))
    if (fields.subCategory2) parts.push(formatName(fields.subCategory2))
    if (fields.subCategory3) parts.push(formatName(fields.subCategory3))
    return parts.join(' > ')
  }
  
  return fields.category ? formatName(fields.category) : ''
}

/**
 * Checks if category fields are properly populated
 */
export function hasCategoryData(fields: Partial<CategoryFields>): boolean {
  return !!(fields.parentCategory || fields.category)
}

/**
 * Extracts category fields from a larger object
 */
export function extractCategoryFields<T extends Partial<CategoryFields>>(obj: T): CategoryFields {
  return {
    category: obj.category || null,
    parentCategory: obj.parentCategory || null,
    subCategory1: obj.subCategory1 || null,
    subCategory2: obj.subCategory2 || null,
    subCategory3: obj.subCategory3 || null,
  }
}

// ============================================================================
// FIELD LISTS FOR VALIDATION
// ============================================================================

/**
 * Required fields for a valid booking request submission
 */
export const REQUIRED_BOOKING_FIELDS = [
  'name',
  'businessEmail',
  'startDate',
  'endDate',
] as const

/**
 * Required fields for category (at least one must be set)
 */
export const CATEGORY_FIELDS = [
  'category',
  'parentCategory',
  'subCategory1',
  'subCategory2',
  'subCategory3',
] as const

/**
 * All fields that should be passed from BookingRequest to EventModal
 */
export const EVENT_MODAL_FIELDS = [
  'name',
  'merchant',
  'businessEmail',
  'category',
  'parentCategory',
  'subCategory1',
  'subCategory2',
  'subCategory3',
  'startDate',
  'endDate',
  'description',
] as const

