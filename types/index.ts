/**
 * Central type exports
 * Import all types from here: import { Event, BookingRequest } from '@/types'
 */

// Event types
export type { Event, EventStatus } from './event'

// Booking request types
export type { BookingRequest } from './booking-request'
export type {
  BookingRequestViewData,
  PricingOption,
  AdditionalInfo,
  UserReference,
  FieldDefinition,
  FieldType,
  SectionDefinition,
} from './booking-request-view'
export type { BookingRequestStatus } from '@/lib/constants'

// Category types
export type {
  CategoryNode,
  CategoryHierarchy,
  CategoryOption,
  CategoryRecord,
  CategoryColors,
  CategoryDurations,
} from './category'

// User types
export type { UserRole, UserProfile, UserData } from './user'

// Shared primitives and entity refs
export type {
  Nullable,
  DateLike,
  DecimalLike,
  CategoryRef,
  UserBaseRef,
  UserRef,
  BusinessRef,
} from './shared'

// Settings types
export type { BusinessException, BookingSettings, RequestFieldConfig, RequestFormFieldsConfig } from './settings'

// Booking field types and utilities
export type {
  CategoryFields,
  BookingIdentificationFields,
  BookingDateFields,
  ContactFields,
  EventModalPrefillData,
} from './booking-fields'
export {
  mapBookingRequestToEventData,
  buildCategoryDisplayString,
  hasCategoryData,
  extractCategoryFields,
  formatDateForInput,
  REQUIRED_BOOKING_FIELDS,
  CATEGORY_FIELDS,
  EVENT_MODAL_FIELDS,
} from './booking-fields'

// Business and Opportunity types
export type { Business, Opportunity, Task } from './business'
export type { OpportunityStage } from '@/lib/constants'

// Lead types
export type { Lead } from './lead'
export type { LeadStage } from '@/lib/constants'

// Deal types
export type { Deal } from './deal'

// Field Comment types
export type { FieldComment, FieldCommentEdit } from './field-comment'
export { 
  isFieldCommentArray, 
  parseFieldComments, 
  getCommentsForField, 
  getCommentCountsByField 
} from './field-comment'

// Form Configuration types
export type {
  FormEntityType,
  FieldWidth,
  FieldSource,
  BuiltinFieldDefinition,
  FormSectionBase,
  FormSection,
  FormSectionWithDefinitions,
  FormFieldConfig,
  FormFieldWithDefinition,
} from './form-config'
export {
  BUSINESS_BUILTIN_FIELDS,
  OPPORTUNITY_BUILTIN_FIELDS,
  DEAL_BUILTIN_FIELDS,
  LEAD_BUILTIN_FIELDS,
  getBuiltinFieldsForEntity,
  getBuiltinFieldDefinition,
  DEFAULT_SECTIONS,
} from './form-config'

// Campaign types
export type { SalesCampaign, BusinessCampaign, CampaignStatus } from './campaign'
export { getCampaignStatus, isCampaignSelectable } from './campaign'
