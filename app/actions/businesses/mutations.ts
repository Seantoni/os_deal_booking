'use server'

import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole, isAdmin } from '@/lib/auth/roles'
import { canEditBusiness } from '@/lib/auth/entity-access'
import { logActivity } from '@/lib/activity-log'
import { sendVendorToExternalApi } from '@/lib/api/external-oferta'

import type { Business } from '@/types'

import {
  ARCHIVED_BUSINESS_STATUS,
  NOT_ARCHIVED_CONDITION,
} from './_shared/constants'
import { resolveCategoryId } from './_shared/categories'

type AdditionalContactValue = {
  name: string
  email: string
  phone: string
  role: string
  isPrimary: boolean
}

type CompatibilityField = 'contactRole' | 'additionalContacts'

function getUnsupportedBusinessDataFields(error: unknown): CompatibilityField[] {
  if (!(error instanceof Error)) {
    return []
  }

  const message = error.message
  const unsupportedFields: CompatibilityField[] = []

  if (
    message.includes('Unknown argument `contactRole`') ||
    message.includes('Unknown field `contactRole`') ||
    (message.includes('contactRole') && message.toLowerCase().includes('does not exist'))
  ) {
    unsupportedFields.push('contactRole')
  }

  if (
    message.includes('Unknown argument `additionalContacts`') ||
    message.includes('Unknown field `additionalContacts`') ||
    (message.includes('additionalContacts') && message.toLowerCase().includes('does not exist'))
  ) {
    unsupportedFields.push('additionalContacts')
  }

  return unsupportedFields
}

async function withBusinessWriteCompatibility<T>(
  initialData: Record<string, unknown>,
  execute: (data: Record<string, unknown>) => Promise<T>,
): Promise<{
  result: T
  appliedData: Record<string, unknown>
  strippedFields: CompatibilityField[]
}> {
  const appliedData = { ...initialData }
  const strippedFields = new Set<CompatibilityField>()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await execute(appliedData)
      return {
        result,
        appliedData,
        strippedFields: Array.from(strippedFields),
      }
    } catch (error) {
      const unsupportedFields = getUnsupportedBusinessDataFields(error)
        .filter((field) => field in appliedData && !strippedFields.has(field))

      if (unsupportedFields.length === 0) {
        throw error
      }

      unsupportedFields.forEach((field) => {
        delete appliedData[field]
        strippedFields.add(field)
      })
    }
  }

  throw new Error('No se pudo guardar por desajuste temporal de versión del servidor.')
}

function parseAdditionalContactsFromFormValue(rawValue: FormDataEntryValue | null): {
  data: AdditionalContactValue[] | null
  error?: string
} {
  if (rawValue === null) {
    return { data: null }
  }

  if (typeof rawValue !== 'string') {
    return { data: null, error: 'Formato inválido de contactos adicionales' }
  }

  const trimmed = rawValue.trim()
  if (!trimmed) {
    return { data: null }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { data: null, error: 'Formato inválido de contactos adicionales' }
  }

  if (!Array.isArray(parsed)) {
    return { data: null, error: 'Formato inválido de contactos adicionales' }
  }

  const normalized = parsed
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      name: typeof entry.name === 'string' ? entry.name.trim() : '',
      email: typeof entry.email === 'string' ? entry.email.trim() : '',
      phone: typeof entry.phone === 'string' ? entry.phone.trim() : '',
      role: typeof entry.role === 'string' ? entry.role.trim() : '',
      isPrimary: typeof entry.isPrimary === 'boolean' ? entry.isPrimary : false,
    }))
    .filter((entry) => entry.name || entry.email || entry.phone || entry.role)

  return { data: normalized.length > 0 ? normalized : null }
}

/**
 * Update business focus period
 * Only assigned sales rep or admin can update focus
 */
export async function updateBusinessFocus(
  businessId: string, 
  focusPeriod: 'month' | 'quarter' | 'year' | null
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Get business to check permissions
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    if (business.reassignmentStatus === ARCHIVED_BUSINESS_STATUS) {
      return { success: false, error: 'No se puede modificar el foco de un negocio archivado' }
    }

    // Check permissions: must be admin or owner
    const admin = await isAdmin()
    const isOwner = business.ownerId === userId

    if (!admin && !isOwner) {
      return { success: false, error: 'No tienes permiso para modificar el foco de este negocio' }
    }

    // Update focus
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        focusPeriod: focusPeriod,
        focusSetAt: focusPeriod ? new Date() : null, // Set timestamp when focus is set, null when cleared
      },
      include: {
        category: {
          select: {
            id: true,
            categoryKey: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
          },
        },
        owner: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Log activity
    const focusLabel = focusPeriod 
      ? { month: 'Mes', quarter: 'Trimestre', year: 'Año' }[focusPeriod] 
      : null
    await logActivity({
      action: 'UPDATE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business.name,
      details: {
        changedFields: ['focusPeriod', 'focusSetAt'],
        changes: {
          focusPeriod: { from: business.focusPeriod, to: focusPeriod },
        },
        metadata: {
          focusAction: focusPeriod ? 'set' : 'cleared',
          focusLabel: focusLabel,
        },
      },
    })

    // Invalidate cache
    invalidateEntity('businesses')

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateBusinessFocus')
  }
}

/**
 * Search businesses across ALL records (server-side search)
 * Used when user types in search bar - searches name, contactName, contactEmail, contactPhone
 * 
 * NOTE: Sales users can VIEW all businesses but only EDIT assigned ones.
 */

/**
 * Create a new business
 */
export async function createBusiness(formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const admin = await isAdmin()
    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const contactRole = formData.get('contactRole') as string | null
    const contactPhone = formData.get('contactPhone') as string
    const contactEmail = formData.get('contactEmail') as string
    const categoryId = formData.get('categoryId') as string | null
    const salesTeam = formData.get('salesTeam') as string | null
    const website = formData.get('website') as string | null
    const instagram = formData.get('instagram') as string | null
    const description = formData.get('description') as string | null
    const tier = formData.get('tier') ? parseInt(formData.get('tier') as string) : null
    const ruc = formData.get('ruc') as string | null
    const razonSocial = formData.get('razonSocial') as string | null
    const provinceDistrictCorregimiento = formData.get('provinceDistrictCorregimiento') as string | null
    const accountManager = formData.get('accountManager') as string | null
    const ere = formData.get('ere') as string | null
    const salesType = formData.get('salesType') as string | null
    const isAsesor = formData.get('isAsesor') as string | null
    const osAsesor = formData.get('osAsesor') as string | null
    const paymentPlan = formData.get('paymentPlan') as string | null
    const bank = formData.get('bank') as string | null
    const beneficiaryName = formData.get('beneficiaryName') as string | null
    const accountNumber = formData.get('accountNumber') as string | null
    const accountType = formData.get('accountType') as string | null
    const emailPaymentContacts = formData.get('emailPaymentContacts') as string | null
    const address = formData.get('address') as string | null
    const neighborhood = formData.get('neighborhood') as string | null
    const osAdminVendorId = formData.get('osAdminVendorId') as string | null
    const ownerIdRaw = formData.get('ownerId') as string | null
    const additionalContactsResult = parseAdditionalContactsFromFormValue(formData.get('additionalContacts'))

    if (additionalContactsResult.error) {
      return { success: false, error: additionalContactsResult.error }
    }

    // Prevent duplicates by business name (case-insensitive)
    const existingBusiness = await prisma.business.findFirst({
      where: {
        AND: [
          {
            name: {
              equals: name,
              mode: 'insensitive',
            },
          },
          NOT_ARCHIVED_CONDITION,
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            categoryKey: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
          },
        },
        owner: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (existingBusiness) {
      return { 
        success: false, 
        error: 'Business already exists', 
        existingBusiness
      }
    }

    // Only 'name' is always required at server level (canSetRequired: false in form config)
    // Other field requirements are determined by admin in Settings → Entity Fields
    if (!name) {
      return { success: false, error: 'Campos requeridos faltantes: Business Name' }
    }

    // Owner/team are admin-editable only.
    // Non-admin creators always use their own profile (owner and team).
    let effectiveOwnerId = userId
    let effectiveSalesTeam = salesTeam || null
    if (admin) {
      if (ownerIdRaw && ownerIdRaw !== '__unassigned__') {
        effectiveOwnerId = ownerIdRaw
      }
    } else {
      const currentProfile = await prisma.userProfile.findUnique({
        where: { clerkId: userId },
        select: { team: true },
      })
      effectiveSalesTeam = currentProfile?.team || null
    }

    // Create business with sales reps
    // Owner is set to the current user by default
    const businessData: Record<string, unknown> = {
      name,
      contactName,
      contactRole: contactRole || null,
      contactPhone,
      contactEmail,
      salesTeam: effectiveSalesTeam,
      website: website || null,
      instagram: instagram || null,
      description: description || null,
      tier: tier || null,
      ruc: ruc || null,
      razonSocial: razonSocial || null,
      provinceDistrictCorregimiento: provinceDistrictCorregimiento || null,
      accountManager: accountManager || null,
      ere: ere || null,
      salesType: salesType || null,
      isAsesor: isAsesor || null,
      osAsesor: osAsesor || null,
      paymentPlan: paymentPlan || null,
      bank: bank || null,
      beneficiaryName: beneficiaryName || null,
      accountNumber: accountNumber || null,
      accountType: accountType || null,
      emailPaymentContacts: emailPaymentContacts || null,
      address: address || null,
      neighborhood: neighborhood || null,
      osAdminVendorId: osAdminVendorId || null,
      additionalContacts: additionalContactsResult.data,
    }

    // Set owner if userId exists
    if (effectiveOwnerId) {
      businessData.owner = {
        connect: { clerkId: effectiveOwnerId }
      }
    }

    // Use relation field for category
    // Resolve categoryId which may be a real ID or a parent category string
    const resolvedCategoryId = await resolveCategoryId(categoryId)
    if (resolvedCategoryId) {
      businessData.category = {
        connect: { id: resolvedCategoryId },
      }
    }

    const createWrite = await withBusinessWriteCompatibility(
      businessData,
      async (compatibleData) => prisma.business.create({
        data: compatibleData as Parameters<typeof prisma.business.create>[0]['data'],
        include: {
          category: {
            select: {
              id: true,
              categoryKey: true,
              parentCategory: true,
              subCategory1: true,
              subCategory2: true,
            },
          },
          owner: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    )
    const business = createWrite.result

    if (createWrite.strippedFields.length > 0) {
      console.warn(
        `[createBusiness] Saved with compatibility fallback; skipped fields: ${createWrite.strippedFields.join(', ')}`
      )
    }

    // Send to external vendor API (non-blocking, don't fail if API fails)
    // This creates the vendor in the external OfertaSimple system
    let vendorApiResult: { success: boolean; externalVendorId?: number; error?: string; logId?: string } | null = null
    try {
      // Convert Prisma result to Business type for the mapper
      // Use unknown intermediate cast as Prisma types have different shapes
      let businessForApi = business as unknown as Business
      
      // If contactEmail is empty, use the current user's email as fallback for vendor API
      // This ensures the vendor can be created even if contact email wasn't provided
      if (!businessForApi.contactEmail) {
        const user = await currentUser()
        const userEmail = user?.emailAddresses?.[0]?.emailAddress
        if (userEmail) {
          businessForApi = { ...businessForApi, contactEmail: userEmail }
          console.log(`[createBusiness] Using user email as fallback for vendor API: ${userEmail}`)
        }
      }
      
      vendorApiResult = await sendVendorToExternalApi(businessForApi, {
        userId,
        triggeredBy: 'manual',
      })
      if (!vendorApiResult.success) {
        console.warn(`[createBusiness] Vendor API failed for business ${business.id}:`, vendorApiResult.error)
      }
    } catch (vendorError) {
      // Don't fail business creation if vendor API fails
      console.error('[createBusiness] Vendor API error:', vendorError)
    }

    // Log activity
    await logActivity({
      action: 'CREATE',
      entityType: 'Business',
      entityId: business.id,
      entityName: business.name,
      details: vendorApiResult ? {
        metadata: {
          vendorApiSuccess: vendorApiResult.success,
          externalVendorId: vendorApiResult.externalVendorId,
          vendorApiError: vendorApiResult.error,
        },
      } : undefined,
    })

    invalidateEntity('businesses')
    
    // Refetch business to get updated osAdminVendorId if vendor was created
    const updatedBusiness = vendorApiResult?.success && vendorApiResult.externalVendorId
      ? await prisma.business.findUnique({
          where: { id: business.id },
          include: {
            category: {
              select: {
                id: true,
                categoryKey: true,
                parentCategory: true,
                subCategory1: true,
                subCategory2: true,
              },
            },
            owner: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
              },
            },
          },
        })
      : business

    return { 
      success: true, 
      data: (updatedBusiness || business) as unknown as Business,
      vendorApiResult: vendorApiResult ? {
        success: vendorApiResult.success,
        externalVendorId: vendorApiResult.externalVendorId,
        error: vendorApiResult.error,
        logId: vendorApiResult.logId,
      } : undefined,
    }
  } catch (error) {
    return handleServerActionError(error, 'createBusiness')
  }
}

/**
 * Update a business
 */
export async function updateBusiness(businessId: string, formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Check if user can edit this business
    // Sales users can VIEW all businesses but only EDIT assigned ones
    const editPermission = await canEditBusiness(businessId)
    if (!editPermission.canEdit) {
      return { 
        success: false, 
        error: 'No tienes permiso para editar este negocio. Solo puedes editar negocios que te han sido asignados.' 
      }
    }

    // Fetch current business data for comparison
    const currentBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!currentBusiness) {
      return { success: false, error: 'Business not found' }
    }

    if (currentBusiness.reassignmentStatus === ARCHIVED_BUSINESS_STATUS) {
      return { success: false, error: 'No se puede editar un negocio archivado' }
    }

    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const contactRole = formData.get('contactRole') as string | null
    const contactPhone = formData.get('contactPhone') as string
    const contactEmail = formData.get('contactEmail') as string
    const categoryId = formData.get('categoryId') as string | null
    const salesTeam = formData.get('salesTeam') as string | null
    const website = formData.get('website') as string | null
    const instagram = formData.get('instagram') as string | null
    const description = formData.get('description') as string | null
    const tier = formData.get('tier') ? parseInt(formData.get('tier') as string) : null
    const ruc = formData.get('ruc') as string | null
    const razonSocial = formData.get('razonSocial') as string | null
    const provinceDistrictCorregimiento = formData.get('provinceDistrictCorregimiento') as string | null
    const accountManager = formData.get('accountManager') as string | null
    const ere = formData.get('ere') as string | null
    const salesType = formData.get('salesType') as string | null
    const isAsesor = formData.get('isAsesor') as string | null
    const osAsesor = formData.get('osAsesor') as string | null
    const paymentPlan = formData.get('paymentPlan') as string | null
    const bank = formData.get('bank') as string | null
    const beneficiaryName = formData.get('beneficiaryName') as string | null
    const accountNumber = formData.get('accountNumber') as string | null
    const accountType = formData.get('accountType') as string | null
    const emailPaymentContacts = formData.get('emailPaymentContacts') as string | null
    const address = formData.get('address') as string | null
    const neighborhood = formData.get('neighborhood') as string | null
    const osAdminVendorId = formData.get('osAdminVendorId') as string | null
    const hasAdditionalContacts = formData.has('additionalContacts')
    const additionalContactsResult = hasAdditionalContacts
      ? parseAdditionalContactsFromFormValue(formData.get('additionalContacts'))
      : { data: null as AdditionalContactValue[] | null }

    if (additionalContactsResult.error) {
      return { success: false, error: additionalContactsResult.error }
    }

    // Only 'name' is always required at server level (canSetRequired: false in form config)
    // Other field requirements are determined by admin in Settings → Entity Fields
    if (!name) {
      return { success: false, error: 'Campos requeridos faltantes: Business Name' }
    }

    // Check if user is admin to allow owner editing
    const admin = await isAdmin()
    const ownerIdRaw = formData.get('ownerId') as string | null
    // Handle special '__unassigned__' value to clear owner
    const ownerId = admin && ownerIdRaw ? (ownerIdRaw === '__unassigned__' ? '__unassigned__' : ownerIdRaw) : undefined

    // Update business
    const updateData: Record<string, unknown> = {
      name,
      contactName,
      contactRole: contactRole || null,
      contactPhone,
      contactEmail,
      salesTeam: admin ? (salesTeam || null) : (currentBusiness?.salesTeam || null),
      website: website || null,
      instagram: instagram || null,
      description: description || null,
      tier: tier || null,
      ruc: ruc || null,
      razonSocial: razonSocial || null,
      provinceDistrictCorregimiento: provinceDistrictCorregimiento || null,
      accountManager: accountManager || null,
      ere: ere || null,
      salesType: salesType || null,
      isAsesor: isAsesor || null,
      osAsesor: osAsesor || null,
      paymentPlan: paymentPlan || null,
      bank: bank || null,
      beneficiaryName: beneficiaryName || null,
      accountNumber: accountNumber || null,
      accountType: accountType || null,
      emailPaymentContacts: emailPaymentContacts || null,
      address: address || null,
      neighborhood: neighborhood || null,
      osAdminVendorId: osAdminVendorId || null,
    }

    if (hasAdditionalContacts) {
      updateData.additionalContacts = additionalContactsResult.data
    }

    // Use relation field for category
    // Resolve categoryId which may be a real ID or a parent category string
    const resolvedCategoryId = await resolveCategoryId(categoryId)
    if (resolvedCategoryId) {
      updateData.category = {
        connect: { id: resolvedCategoryId },
      }
    } else if (categoryId === null || categoryId === '') {
      // Explicitly clearing the category
      updateData.category = {
        disconnect: true,
      }
    }
    // If categoryId was provided but couldn't be resolved, don't change the category

    // Only update owner if admin
    if (admin && ownerId) {
      if (ownerId === '__unassigned__') {
        // Clear the owner - disconnect the relation
        updateData.owner = {
          disconnect: true
        }
      } else {
        // Connect to the specified owner
        updateData.owner = {
          connect: { clerkId: ownerId }
        }
      }
    }

    const updateWrite = await withBusinessWriteCompatibility(
      updateData,
      async (compatibleData) => prisma.business.update({
        where: { id: businessId },
        data: compatibleData as Parameters<typeof prisma.business.update>[0]['data'],
        include: {
          category: {
            select: {
              id: true,
              categoryKey: true,
              parentCategory: true,
              subCategory1: true,
              subCategory2: true,
            },
          },
          owner: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    )
    const business = updateWrite.result
    const appliedUpdateData = updateWrite.appliedData

    if (updateWrite.strippedFields.length > 0) {
      console.warn(
        `[updateBusiness] Saved with compatibility fallback for ${businessId}; skipped fields: ${updateWrite.strippedFields.join(', ')}`
      )
    }

    // Calculate changes for logging
    const previousValues: Record<string, unknown> = {}
    const newValues: Record<string, unknown> = {}
    const changedFields: string[] = []

    if (currentBusiness) {
      const fieldsToCheck = [
        'name',
        'contactName',
        ...(Object.prototype.hasOwnProperty.call(appliedUpdateData, 'contactRole') ? ['contactRole'] : []),
        'contactPhone',
        'contactEmail',
        'website', 'instagram', 'description', 'tier', 'ruc', 
        'razonSocial', 'paymentPlan', 'bank', 'accountNumber',
        ...(Object.prototype.hasOwnProperty.call(appliedUpdateData, 'additionalContacts') ? ['additionalContacts'] : []),
      ]
      
      fieldsToCheck.forEach(field => {
        const oldValue = currentBusiness[field as keyof typeof currentBusiness]
        const newValue = appliedUpdateData[field]

        if (field === 'additionalContacts') {
          const oldJson = JSON.stringify(oldValue ?? null)
          const newJson = JSON.stringify(newValue ?? null)

          if (oldJson !== newJson) {
            changedFields.push(field)
            previousValues[field] = oldValue
            newValues[field] = newValue
          }
          return
        }

        // Check for inequality (handling null/undefined/empty string nuances)
        const normalizedOld = oldValue === null ? undefined : oldValue
        const normalizedNew = newValue === null ? undefined : newValue

        if (normalizedOld !== normalizedNew) {
          changedFields.push(field)
          previousValues[field] = oldValue
          newValues[field] = newValue
        }
      })
    }

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entityType: 'Business',
      entityId: business.id,
      entityName: business.name,
      details: {
        changedFields,
        previousValues,
        newValues
      }
    })

    invalidateEntity('businesses')
    return { success: true, data: business }
  } catch (error) {
    return handleServerActionError(error, 'updateBusiness')
  }
}

/**
 * Archive a business (soft delete)
 */
export async function deleteBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can archive businesses
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get business details before archiving for logging and idempotency checks
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, reassignmentStatus: true },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    // Idempotent behavior if already archived
    if (business.reassignmentStatus !== ARCHIVED_BUSINESS_STATUS) {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          reassignmentStatus: ARCHIVED_BUSINESS_STATUS,
          reassignmentType: null,
          reassignmentRequestedBy: authResult.userId,
          reassignmentRequestedAt: new Date(),
          reassignmentReason: 'archived',
          reassignmentPreviousOwner: null,
        },
      })
    }

    // Log activity
    await logActivity({
      action: 'STATUS_CHANGE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business?.name || undefined,
      details: {
        statusChange: { from: business.reassignmentStatus || 'active', to: ARCHIVED_BUSINESS_STATUS },
      },
    })

    invalidateEntity('businesses')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteBusiness')
  }
}

/**
 * Get archived businesses (admin only)
 */
