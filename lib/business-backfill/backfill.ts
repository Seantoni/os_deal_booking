/**
 * Business Backfill Logic
 * 
 * Handles backfilling empty Business fields from BookingRequest data.
 * Only updates fields that are empty in the Business but filled in the Request.
 */

import { prisma } from '@/lib/prisma'
import { findLinkedBusinessFull } from '@/lib/business'
import { REQUEST_TO_BUSINESS_FIELD_MAP, getVendorApiField } from './mapping'
import { updateVendorInExternalApi } from '@/lib/api/external-oferta/vendor/client'
import type { ExternalOfertaVendorUpdateRequest, UpdateVendorResult } from '@/lib/api/external-oferta/vendor/types'
import type { Business } from '@/types'

/**
 * Represents a single field that can be backfilled
 */
export interface BackfillChange {
  /** Business field name */
  businessField: string
  /** Spanish label for UI */
  label: string
  /** Current value in business (null if empty) */
  oldValue: string | null
  /** Value to be set */
  newValue: string
  /** Whether this is a new value (business was empty) vs an update (overwriting existing) */
  isUpdate: boolean
  /** Vendor API field (if applicable) */
  vendorApiField?: string
}

/**
 * Result of backfill preview (what would be updated)
 */
export interface BackfillPreviewResult {
  success: boolean
  /** Whether there's a linked business */
  hasLinkedBusiness: boolean
  /** Business ID (if found) */
  businessId?: string
  /** Business name (if found) */
  businessName?: string
  /** Whether business has external vendor ID */
  hasVendorId?: boolean
  /** External vendor ID (if exists) */
  vendorId?: string
  /** List of changes that would be made */
  changes: BackfillChange[]
  /** Error message (if any) */
  error?: string
}

/**
 * Result of backfill execution
 */
export interface BackfillExecuteResult {
  success: boolean
  businessId?: string
  businessName?: string
  /** Fields that were updated */
  updatedFields: string[]
  /** Vendor API sync result (if applicable) */
  vendorSyncResult?: UpdateVendorResult
  error?: string
}

/**
 * Normalize a value for comparison (null, undefined, empty string → null)
 */
function normalizeValue(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  return String(value)
}

/**
 * Preview what fields would be backfilled from a booking request to its linked business.
 * 
 * This function:
 * 1. Finds the linked Business using centralized findLinkedBusinessFull utility
 * 2. Compares shared fields
 * 3. Returns list of fields where Business is empty but Request has data
 * 
 * Note: This is primarily used internally. For server action calls, use previewBusinessBackfill.
 * 
 * @param requestId - BookingRequest ID
 * @returns Preview of changes that would be made
 */
export async function previewBackfillFromRequest(requestId: string): Promise<BackfillPreviewResult> {
  try {
    // Get the booking request
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      return {
        success: false,
        hasLinkedBusiness: false,
        changes: [],
        error: 'Booking request not found',
      }
    }

    // Get linked business using centralized utility (single source of truth)
    const business = await findLinkedBusinessFull({
      opportunityId: request.opportunityId,
      email: request.businessEmail,
    })

    if (!business) {
      return {
        success: true,
        hasLinkedBusiness: false,
        changes: [],
      }
    }

    // Calculate changes
    const changes: BackfillChange[] = []

    for (const mapping of REQUEST_TO_BUSINESS_FIELD_MAP) {
      const { requestField, businessField, label, vendorApiField } = mapping

      // Get current business value
      const businessValue = normalizeValue((business as Record<string, unknown>)[businessField])
      
      // Get request value
      const requestValue = normalizeValue((request as Record<string, unknown>)[requestField])

      // Add to changes if:
      // 1. Request field has a value
      // 2. Values are different (either business is empty OR has different value)
      if (requestValue !== null && businessValue !== requestValue) {
        changes.push({
          businessField,
          label,
          oldValue: businessValue,
          newValue: requestValue,
          isUpdate: businessValue !== null, // true if overwriting existing value
          vendorApiField,
        })
      }
    }

    return {
      success: true,
      hasLinkedBusiness: true,
      businessId: business.id,
      businessName: business.name,
      hasVendorId: !!business.osAdminVendorId,
      vendorId: business.osAdminVendorId || undefined,
      changes,
    }
  } catch (error) {
    console.error('[previewBackfillFromRequest] Error:', error)
    return {
      success: false,
      hasLinkedBusiness: false,
      changes: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute backfill from a booking request to its linked business.
 * 
 * This function:
 * 1. Updates Business fields that are empty but have values in Request
 * 2. Optionally syncs to external vendor API if Business has osAdminVendorId
 * 3. Logs the activity
 * 
 * @param requestId - BookingRequest ID
 * @param changes - Pre-calculated changes to apply (from preview)
 * @param options - Additional options
 * @returns Result of the backfill operation
 */
export async function executeBackfillFromRequest(
  requestId: string,
  changes: BackfillChange[],
  options?: {
    userId?: string
    /** Direct business ID (when creating request from Business page without opportunity) */
    businessId?: string
  }
): Promise<BackfillExecuteResult> {
  try {
    if (changes.length === 0) {
      return {
        success: true,
        updatedFields: [],
      }
    }

    // Get request info for business lookup (opportunityId, email)
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      select: { opportunityId: true, businessEmail: true },
    })

    // Get linked business using centralized utility (single source of truth)
    const business = await findLinkedBusinessFull({
      businessId: options?.businessId,
      opportunityId: request?.opportunityId,
      email: request?.businessEmail,
    })

    if (!business) {
      return {
        success: false,
        updatedFields: [],
        error: 'Linked business not found',
      }
    }

    // Build update data for Business
    const updateData: Record<string, string> = {}
    for (const change of changes) {
      updateData[change.businessField] = change.newValue
    }

    // Update business
    await prisma.business.update({
      where: { id: business.id },
      data: updateData,
    })

    const updatedFields = changes.map(c => c.businessField)

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: options?.userId || 'system',
          action: 'BACKFILL_FROM_REQUEST',
          entityType: 'Business',
          entityId: business.id,
          entityName: business.name,
          details: {
            requestId,
            fieldsUpdated: updatedFields,
            changes: changes.map(c => ({
              field: c.businessField,
              label: c.label,
              value: c.newValue,
            })),
          },
        },
      })
    } catch (logError) {
      console.error('[executeBackfillFromRequest] Failed to log activity:', logError)
    }

    // Sync to vendor API if business has external ID
    let vendorSyncResult: UpdateVendorResult | undefined

    if (business.osAdminVendorId) {
      // Build vendor API payload from changes
      const vendorPayload: ExternalOfertaVendorUpdateRequest = {}
      
      for (const change of changes) {
        if (change.vendorApiField) {
          ;(vendorPayload as Record<string, string>)[change.vendorApiField] = change.newValue
          
          // Special case: When email is updated, also update emailContact (both should be the same)
          if (change.vendorApiField === 'email') {
            vendorPayload.emailContact = change.newValue
          }
        }
      }

      // Only call API if there are fields to sync
      if (Object.keys(vendorPayload).length > 0) {
        vendorSyncResult = await updateVendorInExternalApi(
          business.osAdminVendorId,
          vendorPayload,
          {
            userId: options?.userId,
            triggeredBy: 'system',
          }
        )

        // Log vendor sync
        try {
          await prisma.activityLog.create({
            data: {
              userId: options?.userId || 'system',
              action: vendorSyncResult.success ? 'VENDOR_SYNC_SUCCESS' : 'VENDOR_SYNC_FAILED',
              entityType: 'Business',
              entityId: business.id,
              entityName: business.name,
              details: {
                metadata: {
                  vendorId: business.osAdminVendorId,
                  source: 'backfill_from_request',
                  requestId,
                  fieldsUpdated: Object.keys(vendorPayload),
                  syncSuccess: vendorSyncResult.success,
                  syncError: vendorSyncResult.error || null,
                  syncFieldsUpdated: vendorSyncResult.fieldsUpdated || 0,
                },
              },
            },
          })
        } catch (logError) {
          console.error('[executeBackfillFromRequest] Failed to log vendor sync:', logError)
        }
      }
    }

    return {
      success: true,
      businessId: business.id,
      businessName: business.name,
      updatedFields,
      vendorSyncResult,
    }
  } catch (error) {
    console.error('[executeBackfillFromRequest] Error:', error)
    return {
      success: false,
      updatedFields: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
