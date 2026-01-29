'use server'

/**
 * Sales Campaign Server Actions
 */

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { isAdmin } from '@/lib/auth/roles'
import { logActivity } from '@/lib/activity-log'
import type { SalesCampaign, BusinessCampaign } from '@/types'
import type { Prisma } from '@prisma/client'

// Type for raw Prisma campaign with _count
type RawCampaignWithCount = Prisma.SalesCampaignGetPayload<{
  include: { _count: { select: { businesses: true } } }
}>

// Type for raw business campaign with relations
type RawBusinessCampaignWithRelations = Prisma.BusinessCampaignGetPayload<{
  include: {
    business: { select: { id: true; name: true; ownerId: true } }
  }
}>

// Type for campaign assignment with campaign relation
type RawAssignmentWithCampaign = Prisma.BusinessCampaignGetPayload<{
  include: {
    campaign: { include: { _count: { select: { businesses: true } } } }
  }
}>

// ============================================
// Campaign CRUD Operations (Admin only)
// ============================================

/**
 * Get all campaigns ordered by runAt descending (upcoming first, then active, then ended)
 */
export async function getAllCampaigns(): Promise<{
  success: boolean
  data?: SalesCampaign[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const campaigns = await prisma.salesCampaign.findMany({
      orderBy: { runAt: 'desc' },
      include: {
        _count: {
          select: { businesses: true },
        },
      },
    })

    const mappedCampaigns: SalesCampaign[] = campaigns.map((c: RawCampaignWithCount) => ({
      id: c.id,
      name: c.name,
      runAt: c.runAt,
      endAt: c.endAt,
      minBusinesses: c.minBusinesses,
      maxBusinesses: c.maxBusinesses,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      createdBy: c.createdBy,
      businessCount: c._count.businesses,
    }))

    return { success: true, data: mappedCampaigns }
  } catch (error) {
    return handleServerActionError(error, 'getAllCampaigns')
  }
}

/**
 * Get upcoming campaigns only (for business assignment dropdown)
 * Only shows campaigns where runAt > today
 */
export async function getUpcomingCampaigns(): Promise<{
  success: boolean
  data?: SalesCampaign[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const now = new Date()

    const campaigns = await prisma.salesCampaign.findMany({
      where: {
        runAt: { gt: now },
      },
      orderBy: { runAt: 'asc' }, // Soonest first for selection
      include: {
        _count: {
          select: { businesses: true },
        },
      },
    })

    const mappedCampaigns: SalesCampaign[] = campaigns.map((c: RawCampaignWithCount) => ({
      id: c.id,
      name: c.name,
      runAt: c.runAt,
      endAt: c.endAt,
      minBusinesses: c.minBusinesses,
      maxBusinesses: c.maxBusinesses,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      createdBy: c.createdBy,
      businessCount: c._count.businesses,
    }))

    return { success: true, data: mappedCampaigns }
  } catch (error) {
    return handleServerActionError(error, 'getUpcomingCampaigns')
  }
}

/**
 * Get a single campaign with its businesses
 */
export async function getCampaignWithBusinesses(campaignId: string): Promise<{
  success: boolean
  data?: SalesCampaign & { businesses: BusinessCampaign[] }
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const campaign = await prisma.salesCampaign.findUnique({
      where: { id: campaignId },
      include: {
        businesses: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                ownerId: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        _count: {
          select: { businesses: true },
        },
      },
    })

    if (!campaign) {
      return { success: false, error: 'Campaña no encontrada' }
    }

    // Fetch owner info for businesses
    const ownerIds = campaign.businesses
      .map((bc: RawBusinessCampaignWithRelations) => bc.business.ownerId)
      .filter(Boolean) as string[]

    const owners = ownerIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: ownerIds } },
          select: { clerkId: true, name: true, email: true, id: true },
        })
      : []

    const ownerMap = new Map(owners.map((o) => [o.clerkId, o]))

    const mappedBusinesses: BusinessCampaign[] = campaign.businesses.map((bc: RawBusinessCampaignWithRelations) => ({
      id: bc.id,
      businessId: bc.businessId,
      campaignId: bc.campaignId,
      assignedAt: bc.assignedAt,
      assignedBy: bc.assignedBy,
      business: {
        id: bc.business.id,
        name: bc.business.name,
        ownerId: bc.business.ownerId,
        owner: bc.business.ownerId ? ownerMap.get(bc.business.ownerId) || null : null,
      },
    }))

    return {
      success: true,
      data: {
        id: campaign.id,
        name: campaign.name,
        runAt: campaign.runAt,
        endAt: campaign.endAt,
        minBusinesses: campaign.minBusinesses,
        maxBusinesses: campaign.maxBusinesses,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        createdBy: campaign.createdBy,
        businessCount: campaign._count.businesses,
        businesses: mappedBusinesses,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'getCampaignWithBusinesses')
  }
}

/**
 * Create a new campaign (Admin only)
 */
export async function createCampaign(data: {
  name: string
  runAt: Date | string
  endAt: Date | string
  minBusinesses?: number | null
  maxBusinesses?: number | null
}): Promise<{
  success: boolean
  data?: SalesCampaign
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  // Admin only
  const adminCheck = await isAdmin()
  if (!adminCheck) {
    return { success: false, error: 'Solo administradores pueden crear campañas' }
  }

  try {
    // Validate dates
    const runAt = new Date(data.runAt)
    const endAt = new Date(data.endAt)

    if (endAt <= runAt) {
      return { success: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' }
    }

    const campaign = await prisma.salesCampaign.create({
      data: {
        name: data.name,
        runAt,
        endAt,
        minBusinesses: data.minBusinesses ?? null,
        maxBusinesses: data.maxBusinesses ?? null,
        createdBy: userId,
      },
    })

    await logActivity({
      action: 'CREATE',
      entityType: 'SalesCampaign',
      entityId: campaign.id,
      entityName: campaign.name,
    })

    return {
      success: true,
      data: {
        ...campaign,
        businessCount: 0,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'createCampaign')
  }
}

/**
 * Update an existing campaign (Admin only)
 */
export async function updateCampaign(
  campaignId: string,
  data: {
    name?: string
    runAt?: Date | string
    endAt?: Date | string
    minBusinesses?: number | null
    maxBusinesses?: number | null
  }
): Promise<{
  success: boolean
  data?: SalesCampaign
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  // Admin only
  const adminCheck = await isAdmin()
  if (!adminCheck) {
    return { success: false, error: 'Solo administradores pueden editar campañas' }
  }

  try {
    const existing = await prisma.salesCampaign.findUnique({
      where: { id: campaignId },
      include: { _count: { select: { businesses: true } } },
    })

    if (!existing) {
      return { success: false, error: 'Campaña no encontrada' }
    }

    // Build update data
    const updateData: Prisma.SalesCampaignUpdateInput = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.runAt !== undefined) updateData.runAt = new Date(data.runAt)
    if (data.endAt !== undefined) updateData.endAt = new Date(data.endAt)
    if (data.minBusinesses !== undefined) updateData.minBusinesses = data.minBusinesses
    if (data.maxBusinesses !== undefined) updateData.maxBusinesses = data.maxBusinesses

    // Validate dates if both are being set
    const finalRunAt = (updateData.runAt as Date | undefined) ?? existing.runAt
    const finalEndAt = (updateData.endAt as Date | undefined) ?? existing.endAt

    if (new Date(finalEndAt) <= new Date(finalRunAt)) {
      return { success: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' }
    }

    const campaign = await prisma.salesCampaign.update({
      where: { id: campaignId },
      data: updateData,
    })

    await logActivity({
      action: 'UPDATE',
      entityType: 'SalesCampaign',
      entityId: campaign.id,
      entityName: campaign.name,
      details: { changes: data },
    })

    return {
      success: true,
      data: {
        ...campaign,
        businessCount: existing._count.businesses,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'updateCampaign')
  }
}

/**
 * Delete a campaign (Admin only, only if no businesses assigned)
 */
export async function deleteCampaign(campaignId: string): Promise<{
  success: boolean
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  // Admin only
  const adminCheck = await isAdmin()
  if (!adminCheck) {
    return { success: false, error: 'Solo administradores pueden eliminar campañas' }
  }

  try {
    const campaign = await prisma.salesCampaign.findUnique({
      where: { id: campaignId },
      include: { _count: { select: { businesses: true } } },
    })

    if (!campaign) {
      return { success: false, error: 'Campaña no encontrada' }
    }

    if (campaign._count.businesses > 0) {
      return { 
        success: false, 
        error: `No se puede eliminar la campaña porque tiene ${campaign._count.businesses} negocio(s) asignado(s). Primero debe remover todos los negocios.` 
      }
    }

    await prisma.salesCampaign.delete({
      where: { id: campaignId },
    })

    await logActivity({
      action: 'DELETE',
      entityType: 'SalesCampaign',
      entityId: campaignId,
      entityName: campaign.name,
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteCampaign')
  }
}

// ============================================
// Business Assignment Operations (Admin only)
// ============================================

/**
 * Assign a business to one or more campaigns (Admin only)
 */
export async function assignBusinessToCampaigns(
  businessId: string,
  campaignIds: string[]
): Promise<{
  success: boolean
  data?: BusinessCampaign[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  // Admin only
  const adminCheck = await isAdmin()
  if (!adminCheck) {
    return { success: false, error: 'Solo administradores pueden asignar negocios a campañas' }
  }

  if (campaignIds.length === 0) {
    return { success: false, error: 'Debe seleccionar al menos una campaña' }
  }

  try {
    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })

    if (!business) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Verify all campaigns exist and check max limits
    const now = new Date()
    const campaigns = await prisma.salesCampaign.findMany({
      where: { id: { in: campaignIds } },
      include: { _count: { select: { businesses: true } } },
    })

    if (campaigns.length !== campaignIds.length) {
      return { success: false, error: 'Una o más campañas no fueron encontradas' }
    }

    // Check for campaigns that are not upcoming
    const notUpcoming = campaigns.filter((c: RawCampaignWithCount) => c.runAt <= now)
    if (notUpcoming.length > 0) {
      return { 
        success: false, 
        error: `Solo se pueden agregar negocios a campañas futuras. "${notUpcoming[0].name}" ya inició.` 
      }
    }

    // Check max limits
    for (const campaign of campaigns) {
      if (campaign.maxBusinesses && campaign._count.businesses >= campaign.maxBusinesses) {
        return { 
          success: false, 
          error: `La campaña "${campaign.name}" ya alcanzó su límite máximo de ${campaign.maxBusinesses} negocios` 
        }
      }
    }

    // Get existing assignments to avoid duplicates
    const existingAssignments = await prisma.businessCampaign.findMany({
      where: {
        businessId,
        campaignId: { in: campaignIds },
      },
      select: { campaignId: true },
    })

    const existingCampaignIds = new Set(existingAssignments.map((a) => a.campaignId))
    const newCampaignIds = campaignIds.filter((id) => !existingCampaignIds.has(id))

    if (newCampaignIds.length === 0) {
      return { success: false, error: 'El negocio ya está asignado a todas las campañas seleccionadas' }
    }

    // Create new assignments
    const createdAssignments = await prisma.$transaction(
      newCampaignIds.map((campaignId: string) =>
        prisma.businessCampaign.create({
          data: {
            businessId,
            campaignId,
            assignedBy: userId,
          },
        })
      )
    )

    // Log activity
    const campaignNames = campaigns
      .filter((c: RawCampaignWithCount) => newCampaignIds.includes(c.id))
      .map((c: RawCampaignWithCount) => c.name)
      .join(', ')

    await logActivity({
      action: 'CREATE',
      entityType: 'BusinessCampaign',
      entityId: businessId,
      entityName: business.name,
      details: { 
        metadata: { campaigns: campaignNames, campaignCount: newCampaignIds.length },
      },
    })

    return { success: true, data: createdAssignments }
  } catch (error) {
    return handleServerActionError(error, 'assignBusinessToCampaigns')
  }
}

/**
 * Remove a business from a campaign (Admin only)
 */
export async function removeBusinessFromCampaign(
  businessId: string,
  campaignId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  // Admin only
  const adminCheck = await isAdmin()
  if (!adminCheck) {
    return { success: false, error: 'Solo administradores pueden remover negocios de campañas' }
  }

  try {
    const assignment = await prisma.businessCampaign.findUnique({
      where: {
        businessId_campaignId: { businessId, campaignId },
      },
      include: {
        business: { select: { name: true } },
        campaign: { select: { name: true } },
      },
    })

    if (!assignment) {
      return { success: false, error: 'Asignación no encontrada' }
    }

    await prisma.businessCampaign.delete({
      where: { id: assignment.id },
    })

    await logActivity({
      action: 'DELETE',
      entityType: 'BusinessCampaign',
      entityId: businessId,
      entityName: assignment.business.name,
      details: { 
        metadata: { campaignName: assignment.campaign.name },
      },
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'removeBusinessFromCampaign')
  }
}

/**
 * Get campaigns assigned to a specific business
 */
export async function getBusinessCampaigns(businessId: string): Promise<{
  success: boolean
  data?: { campaign: SalesCampaign; assignedAt: Date | string }[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const assignments = await prisma.businessCampaign.findMany({
      where: { businessId },
      include: {
        campaign: {
          include: {
            _count: { select: { businesses: true } },
          },
        },
      },
      orderBy: { campaign: { runAt: 'desc' } },
    })

    const result = assignments.map((a: RawAssignmentWithCampaign) => ({
      campaign: {
        id: a.campaign.id,
        name: a.campaign.name,
        runAt: a.campaign.runAt,
        endAt: a.campaign.endAt,
        minBusinesses: a.campaign.minBusinesses,
        maxBusinesses: a.campaign.maxBusinesses,
        createdAt: a.campaign.createdAt,
        updatedAt: a.campaign.updatedAt,
        createdBy: a.campaign.createdBy,
        businessCount: a.campaign._count.businesses,
      },
      assignedAt: a.assignedAt,
    }))

    return { success: true, data: result }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessCampaigns')
  }
}

/**
 * Get business campaign counts for display (how many active/upcoming campaigns each business is in)
 */
export async function getBusinessCampaignCounts(): Promise<{
  success: boolean
  data?: Record<string, number>
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const now = new Date()

    const assignments = await prisma.businessCampaign.groupBy({
      by: ['businessId'],
      where: {
        campaign: {
          endAt: { gte: now },
        },
      },
      _count: true,
    })

    const counts: Record<string, number> = {}
    for (const a of assignments) {
      counts[a.businessId] = a._count
    }

    return { success: true, data: counts }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessCampaignCounts')
  }
}

