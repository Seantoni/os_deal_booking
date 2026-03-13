'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { isAdmin } from '@/lib/auth/roles'
import { logActivity } from '@/lib/activity-log'
import { updateVendorInExternalApi, getChangedVendorFields } from '@/lib/api/external-oferta'

import type { VendorFieldChange, UpdateVendorResult } from '@/lib/api/external-oferta/vendor/types'
import type { Business } from '@/types'

import { updateBusiness } from './mutations'

// Note: Bulk import (BulkBusinessRow, BulkUpsertResult, bulkUpsertBusinesses) 
// has been moved to app/actions/business-bulk.ts
// Import from there: import { bulkUpsertBusinesses, type BulkBusinessRow, type BulkUpsertResult } from '@/app/actions/business-bulk'

/**
 * Preview changes that would be synced to external vendor API
 * Returns the list of field changes without actually sending them
 */
export async function previewVendorSync(
  businessId: string,
  newValues: Record<string, string | null | undefined>
): Promise<{
  success: boolean
  data?: {
    changes: VendorFieldChange[]
    vendorId: string
  }
  error?: string
}> {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return { success: false, error: 'No autorizado' }
    }
    const { userId } = authResult

    // Get current business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { category: true },
    })

    if (!business) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Require admin OR business owner
    const adminCheck = await isAdmin()
    const isOwner = business.ownerId === userId

    if (!adminCheck && !isOwner) {
      return { success: false, error: 'Solo administradores o propietarios del negocio pueden sincronizar con OfertaSimple' }
    }

    if (!business.osAdminVendorId) {
      return { success: false, error: 'Este negocio no tiene un Vendor ID de OfertaSimple' }
    }

    // Get changed fields
    const { changes } = getChangedVendorFields(business as unknown as Business, newValues)

    return {
      success: true,
      data: {
        changes,
        vendorId: business.osAdminVendorId,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'previewVendorSync')
  }
}

/**
 * Sync business changes to external vendor API
 * 
 * This function:
 * 1. Validates admin permissions
 * 2. Saves business locally first (auto-save)
 * 3. Calculates changed fields
 * 4. Sends PATCH to external API with only changed fields
 * 
 * @param businessId - Business ID to sync
 * @param formData - Form data with new values (used for local save)
 * @returns Result with sync status and updated business
 */
export async function syncVendorToExternal(
  businessId: string,
  formData: FormData
): Promise<{
  success: boolean
  data?: {
    business: Business
    syncResult: UpdateVendorResult
    fieldsUpdated: number
  }
  error?: string
  errorDetails?: string
}> {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return { success: false, error: 'No autorizado' }
    }
    const { userId } = authResult

    // Get current business before update
    const currentBusiness = await prisma.business.findUnique({
      where: { id: businessId },
      include: { category: true },
    })

    if (!currentBusiness) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Require admin OR business owner
    const adminCheck = await isAdmin()
    const isOwner = currentBusiness.ownerId === userId

    if (!adminCheck && !isOwner) {
      return { success: false, error: 'Solo administradores o propietarios del negocio pueden sincronizar con OfertaSimple' }
    }

    if (!currentBusiness.osAdminVendorId) {
      return { success: false, error: 'Este negocio no tiene un Vendor ID de OfertaSimple' }
    }

    // Extract form values into a record
    const newValues: Record<string, string | null> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        newValues[key] = value || null
      }
    }

    // Get changed fields for API (before saving locally)
    const { changes, apiPayload } = getChangedVendorFields(
      currentBusiness as unknown as Business, 
      newValues
    )

    // If no changes, return early
    if (changes.length === 0) {
      return { 
        success: false, 
        error: 'No hay cambios para sincronizar' 
      }
    }

    // Step 1: Save locally first (auto-save)
    const updateResult = await updateBusiness(businessId, formData)
    if (!updateResult.success || !updateResult.data) {
      const localErrorDetail = updateResult.error || 'Error desconocido'
      const localErrorMessage = localErrorDetail.includes('Unknown argument `contactRole`')
        ? 'No se pudo guardar localmente por desajuste de versión del servidor.'
        : 'No se pudieron guardar los cambios localmente.'

      return { 
        success: false, 
        error: localErrorMessage,
        errorDetails: localErrorDetail,
      }
    }

    // Step 2: Send PATCH to external API
    const syncResult = await updateVendorInExternalApi(
      currentBusiness.osAdminVendorId,
      apiPayload,
      {
        userId,
        triggeredBy: 'manual',
      }
    )

    // Log activity
    await logActivity({
      action: 'SEND',
      entityType: 'Business',
      entityId: businessId,
      details: {
        newValues: {
          vendorId: currentBusiness.osAdminVendorId,
          fieldsUpdated: changes.length,
          syncSuccess: syncResult.success,
          syncError: syncResult.error,
        },
      },
    })

    if (!syncResult.success) {
      return {
        success: false,
        error: 'Cambios guardados localmente, pero falló la sincronización con OfertaSimple.',
        errorDetails: syncResult.error || 'Error desconocido al sincronizar con OfertaSimple',
      }
    }

    return {
      success: true,
      data: {
        business: updateResult.data,
        syncResult,
        fieldsUpdated: changes.length,
      },
    }
  } catch (error) {
    const fallback = handleServerActionError(error, 'syncVendorToExternal')
    return {
      success: false,
      error: 'No se pudo completar la sincronización.',
      errorDetails: fallback.error || (error instanceof Error ? error.message : 'Error desconocido'),
    }
  }
}
