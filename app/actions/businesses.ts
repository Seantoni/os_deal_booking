'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole, isAdmin } from '@/lib/auth/roles'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'

/**
 * Get all businesses (cached)
 */
export async function getBusinesses() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const cacheKey = `businesses-${userId}-${role}`

    const getCachedBusinesses = unstable_cache(
      async () => {
        // Build where clause based on role
        const whereClause: Record<string, unknown> = {}
        
        if (role === 'sales') {
          // Sales only see businesses where they are the owner
          whereClause.ownerId = userId
        } else if (role === 'editor' || role === 'ere') {
          // Editors and ERE don't have access to businesses
          return []
        }
        // Admin sees all (no where clause)

        const businesses = await prisma.business.findMany({
          where: whereClause,
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
            salesReps: {
              include: {
                salesRep: {
                  select: {
                    id: true,
                    clerkId: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Get custom field values for all businesses
        const businessIds = businesses.map(b => b.id)
        const customFieldValues = businessIds.length > 0
          ? await prisma.customFieldValue.findMany({
              where: {
                entityType: 'business',
                entityId: { in: businessIds },
              },
              include: {
                customField: {
                  select: {
                    fieldKey: true,
                  },
                },
              },
            })
          : []

        // Group custom field values by business ID
        const customFieldsByBusinessId = new Map<string, Record<string, string | null>>()
        for (const cfv of customFieldValues) {
          if (!customFieldsByBusinessId.has(cfv.entityId)) {
            customFieldsByBusinessId.set(cfv.entityId, {})
          }
          customFieldsByBusinessId.get(cfv.entityId)![cfv.customField.fieldKey] = cfv.value
        }

        // Add custom fields to each business
        return businesses.map(biz => ({
          ...biz,
          customFields: customFieldsByBusinessId.get(biz.id) || {},
        }))
      },
      [cacheKey],
      {
        tags: ['businesses'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const businesses = await getCachedBusinesses()
    return { success: true, data: businesses }
  } catch (error) {
    return handleServerActionError(error, 'getBusinesses')
  }
}

/**
 * Get a single business by ID
 */
export async function getBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
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
        salesReps: {
          include: {
            salesRep: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
              },
            },
          },
        },
        opportunities: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    return { success: true, data: business }
  } catch (error) {
    return handleServerActionError(error, 'getBusiness')
  }
}

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
    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const contactPhone = formData.get('contactPhone') as string
    const contactEmail = formData.get('contactEmail') as string
    const categoryId = formData.get('categoryId') as string | null
    const salesRepIds = formData.getAll('salesRepIds') as string[] // Array of clerkIds
    const salesTeam = formData.get('salesTeam') as string | null
    const website = formData.get('website') as string | null
    const instagram = formData.get('instagram') as string | null
    const description = formData.get('description') as string | null
    const tier = formData.get('tier') ? parseInt(formData.get('tier') as string) : null
    const ruc = formData.get('ruc') as string | null
    const razonSocial = formData.get('razonSocial') as string | null
    const province = formData.get('province') as string | null
    const district = formData.get('district') as string | null
    const corregimiento = formData.get('corregimiento') as string | null
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

    // Prevent duplicates by business name (case-insensitive)
    const existingBusiness = await prisma.business.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
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
        salesReps: true,
      },
    })

    if (existingBusiness) {
      return { success: false, error: 'Business already exists', existingBusiness }
    }

    if (!name || !contactName || !contactPhone || !contactEmail) {
      return { success: false, error: 'Missing required fields' }
    }

    // Create business with sales reps
    // Owner is set to the current user by default
    const businessData: Record<string, unknown> = {
      name,
      contactName,
      contactPhone,
      contactEmail,
      salesTeam: salesTeam || null,
      website: website || null,
      instagram: instagram || null,
      description: description || null,
      tier: tier || null,
      ruc: ruc || null,
      razonSocial: razonSocial || null,
      province: province || null,
      district: district || null,
      corregimiento: corregimiento || null,
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
      salesReps: {
        create: salesRepIds.map((clerkId) => ({
          salesRepId: clerkId,
        })),
      },
    }

    // Set ownerId if userId exists
    if (userId) {
      businessData.ownerId = userId
    }

    // Use relation field for category
    if (categoryId) {
      businessData.category = {
        connect: { id: categoryId },
      }
    }

    const business = await prisma.business.create({
      data: businessData as Parameters<typeof prisma.business.create>[0]['data'],
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
        salesReps: true,
      },
    })

    // Log activity
    await logActivity({
      action: 'CREATE',
      entityType: 'Business',
      entityId: business.id,
      entityName: business.name,
    })

    invalidateEntity('businesses')
    return { success: true, data: business }
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
    // Fetch current business data for comparison
    const currentBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    })

    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const contactPhone = formData.get('contactPhone') as string
    const contactEmail = formData.get('contactEmail') as string
    const categoryId = formData.get('categoryId') as string | null
    const salesRepIds = formData.getAll('salesRepIds') as string[]
    const salesTeam = formData.get('salesTeam') as string | null
    const website = formData.get('website') as string | null
    const instagram = formData.get('instagram') as string | null
    const description = formData.get('description') as string | null
    const tier = formData.get('tier') ? parseInt(formData.get('tier') as string) : null
    const ruc = formData.get('ruc') as string | null
    const razonSocial = formData.get('razonSocial') as string | null
    const province = formData.get('province') as string | null
    const district = formData.get('district') as string | null
    const corregimiento = formData.get('corregimiento') as string | null
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

    if (!name || !contactName || !contactPhone || !contactEmail) {
      return { success: false, error: 'Missing required fields' }
    }

    // Check if user is admin to allow owner editing
    const admin = await isAdmin()
    const ownerId = admin && formData.get('ownerId') ? (formData.get('ownerId') as string) : undefined

    // Update business and sales reps
    // First, delete existing sales rep associations
    await prisma.businessSalesRep.deleteMany({
      where: { businessId },
    })

    // Then update business and create new associations
    const updateData: Record<string, unknown> = {
      name,
      contactName,
      contactPhone,
      contactEmail,
      salesTeam: salesTeam || null,
      website: website || null,
      instagram: instagram || null,
      description: description || null,
      tier: tier || null,
      ruc: ruc || null,
      razonSocial: razonSocial || null,
      province: province || null,
      district: district || null,
      corregimiento: corregimiento || null,
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
      salesReps: {
        create: salesRepIds.map((clerkId) => ({
          salesRepId: clerkId,
        })),
      },
    }

    // Use relation field for category
    if (categoryId) {
      updateData.category = {
        connect: { id: categoryId },
      }
    } else {
      updateData.category = {
        disconnect: true,
      }
    }

    // Only update owner if admin
    if (admin && ownerId) {
      updateData.ownerId = ownerId
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: updateData as Parameters<typeof prisma.business.update>[0]['data'],
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
        salesReps: true,
      },
    })

    // Calculate changes for logging
    const previousValues: Record<string, any> = {}
    const newValues: Record<string, any> = {}
    const changedFields: string[] = []

    if (currentBusiness) {
      const fieldsToCheck = [
        'name', 'contactName', 'contactPhone', 'contactEmail', 
        'website', 'instagram', 'description', 'tier', 'ruc', 
        'razonSocial', 'paymentPlan', 'bank', 'accountNumber'
      ]
      
      fieldsToCheck.forEach(field => {
        const oldValue = currentBusiness[field as keyof typeof currentBusiness]
        const newValue = updateData[field]
        
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
 * Delete a business
 */
export async function deleteBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can delete businesses
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get business name before deleting for logging
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    })

    await prisma.business.delete({
      where: { id: businessId },
    })

    // Log activity
    await logActivity({
      action: 'DELETE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business?.name || undefined,
    })

    invalidateEntity('businesses')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteBusiness')
  }
}

/**
 * Get all businesses with booking status (has future events or active requests)
 * Used for BusinessSelect dropdown component
 */
export async function getBusinessesWithBookingStatus() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all businesses with basic info
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            categoryKey: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
          },
        },
        website: true,
        instagram: true,
        description: true,
        ruc: true,
        razonSocial: true,
        province: true,
        district: true,
        corregimiento: true,
        bank: true,
        beneficiaryName: true,
        accountNumber: true,
        accountType: true,
        paymentPlan: true,
        address: true,
        neighborhood: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get all future booked events (by merchant name matching business name)
    const futureBookedEvents = await prisma.event.findMany({
      where: {
        status: 'booked',
        endDate: { gte: today },
      },
      select: {
        merchant: true,
      },
    })
    const bookedMerchants = new Set(
      futureBookedEvents
        .map(e => e.merchant?.toLowerCase())
        .filter(Boolean) as string[]
    )

    // Get all pending/approved booking requests with future dates
    const activeRequests = await prisma.bookingRequest.findMany({
      where: {
        status: { in: ['pending', 'approved'] },
        endDate: { gte: today },
      },
      select: {
        merchant: true,
        name: true,
      },
    })
    const requestMerchants = new Set(
      activeRequests
        .flatMap(r => [r.merchant?.toLowerCase(), r.name?.toLowerCase()])
        .filter(Boolean) as string[]
    )

    // Map businesses with booking status
    const businessesWithStatus = businesses.map(business => {
      const nameLower = business.name.toLowerCase()
      return {
        ...business,
        hasFutureBooking: bookedMerchants.has(nameLower),
        hasActiveRequest: requestMerchants.has(nameLower),
      }
    })

    return { success: true, data: businessesWithStatus }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessesWithBookingStatus')
  }
}


