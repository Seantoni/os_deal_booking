/**
 * Business Backfill Module
 * 
 * Handles backfilling empty Business fields from BookingRequest data
 * when a request is sent.
 */

export {
  previewBackfillFromRequest,
  executeBackfillFromRequest,
  type BackfillChange,
  type BackfillPreviewResult,
  type BackfillExecuteResult,
} from './backfill'

export {
  REQUEST_TO_BUSINESS_FIELD_MAP,
  getBusinessFieldLabel,
  getVendorApiField,
  type FieldMapping,
} from './mapping'
