'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError, buildRoleBasedWhereClause } from '@/lib/utils/server-actions'
import { invalidateEntity, invalidateEntities } from '@/lib/cache'
import { getUserRole, isAdmin as checkIsAdmin } from '@/lib/auth/roles'
import { logger } from '@/lib/logger'
import { LEAD_STAGES, type LeadStage } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'

/**
 * Get all leads with filtering based on user role
 */
export async function getLeads() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const isAdmin = role === 'admin'

    // Build where clause based on role
    let whereClause = {}
    if (!isAdmin) {
      // Non-admin users can only see leads assigned to them
      if (role === 'sales') {
        whereClause = { responsibleId: userId }
      }
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        category: true,
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch responsible users for each lead
    const responsibleIds = [...new Set(leads.filter(l => l.responsibleId).map(l => l.responsibleId!))]
    const responsibleUsers = responsibleIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: responsibleIds } },
          select: { clerkId: true, name: true, email: true },
        })
      : []

    const responsibleMap = new Map(responsibleUsers.map(u => [u.clerkId, u]))

    // Attach responsible user info to leads
    const leadsWithResponsible = leads.map(lead => ({
      ...lead,
      responsible: lead.responsibleId ? responsibleMap.get(lead.responsibleId) || null : null,
    }))

    return { success: true, data: leadsWithResponsible }
  } catch (error) {
    return handleServerActionError(error, 'getLeads')
  }
}

/**
 * Get a single lead by ID
 */
export async function getLead(id: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        category: true,
        business: true,
      },
    })

    if (!lead) {
      return { success: false, error: 'Lead not found' }
    }

    // Fetch responsible user info
    let responsible = null
    if (lead.responsibleId) {
      responsible = await prisma.userProfile.findUnique({
        where: { clerkId: lead.responsibleId },
        select: { clerkId: true, name: true, email: true },
      })
    }

    return { success: true, data: { ...lead, responsible } }
  } catch (error) {
    return handleServerActionError(error, 'getLead')
  }
}

/**
 * Create a new lead
 */
export async function createLead(data: {
  name: string
  contactName: string
  contactPhone: string
  contactEmail: string
  categoryId?: string | null
  responsibleId?: string | null
  website?: string | null
  instagram?: string | null
  description?: string | null
  source?: string | null
  notes?: string | null
}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        categoryId: data.categoryId || null,
        responsibleId: data.responsibleId || null,
        website: data.website || null,
        instagram: data.instagram || null,
        description: data.description || null,
        source: data.source || null,
        notes: data.notes || null,
        stage: LEAD_STAGES.POR_ASIGNAR,
      },
      include: {
        category: true,
      },
    })

    // Log activity
    await logActivity({
      action: 'CREATE',
      entityType: 'Lead',
      entityId: lead.id,
      entityName: lead.name,
    })

    invalidateEntity('leads')

    return { success: true, data: lead }
  } catch (error) {
    return handleServerActionError(error, 'createLead')
  }
}

/**
 * Update an existing lead
 */
export async function updateLead(
  id: string,
  data: {
    name?: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    categoryId?: string | null
    responsibleId?: string | null
    stage?: LeadStage
    website?: string | null
    instagram?: string | null
    description?: string | null
    source?: string | null
    notes?: string | null
  }
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const existingLead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!existingLead) {
      return { success: false, error: 'Lead not found' }
    }

    // Check if user can edit this lead
    const role = await getUserRole()
    const isAdmin = role === 'admin'
    if (!isAdmin && existingLead.responsibleId !== userId) {
      return { success: false, error: 'You do not have permission to edit this lead' }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.responsibleId !== undefined && { responsibleId: data.responsibleId }),
        ...(data.stage !== undefined && { stage: data.stage }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.instagram !== undefined && { instagram: data.instagram }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        category: true,
      },
    })

    // Log activity - check if stage changed
    if (data.stage !== undefined && existingLead.stage !== data.stage) {
      await logActivity({
        action: 'STATUS_CHANGE',
        entityType: 'Lead',
        entityId: lead.id,
        entityName: lead.name,
        details: {
          statusChange: { from: existingLead.stage, to: data.stage },
        },
      })
    } else {
      await logActivity({
        action: 'UPDATE',
        entityType: 'Lead',
        entityId: lead.id,
        entityName: lead.name,
      })
    }

    invalidateEntity('leads')

    return { success: true, data: lead }
  } catch (error) {
    return handleServerActionError(error, 'updateLead')
  }
}

/**
 * Delete a lead
 */
export async function deleteLead(id: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can delete leads
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return { success: false, error: 'Only admins can delete leads' }
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!lead) {
      return { success: false, error: 'Lead not found' }
    }

    // Don't allow deleting converted leads
    if (lead.businessId) {
      return { success: false, error: 'Cannot delete a converted lead' }
    }

    await prisma.lead.delete({
      where: { id },
    })

    // Log activity
    await logActivity({
      action: 'DELETE',
      entityType: 'Lead',
      entityId: id,
      entityName: lead.name,
    })

    invalidateEntity('leads')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteLead')
  }
}

/**
 * Convert a lead to a business
 * This is triggered when the lead stage is changed to 'asignado'
 */
export async function convertLeadToBusiness(leadId: string, responsibleId?: string | null) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { category: true },
    })

    if (!lead) {
      return { success: false, error: 'Lead not found' }
    }

    if (lead.businessId) {
      return { success: false, error: 'Lead has already been converted' }
    }

    // Create the business from lead data
    const business = await prisma.business.create({
      data: {
        name: lead.name,
        contactName: lead.contactName,
        contactPhone: lead.contactPhone,
        contactEmail: lead.contactEmail,
        categoryId: lead.categoryId,
        ownerId: responsibleId || userId,
        website: lead.website,
        instagram: lead.instagram,
        description: lead.description,
        leadId: lead.id,
      },
      include: {
        category: true,
      },
    })

    // Update lead to mark as converted
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        stage: LEAD_STAGES.CONVERTIDO,
        businessId: business.id,
        convertedAt: new Date(),
      },
    })

    invalidateEntities(['leads', 'businesses'])

    return { success: true, data: { lead: { ...lead, businessId: business.id }, business } }
  } catch (error) {
    return handleServerActionError(error, 'convertLeadToBusiness')
  }
}

/**
 * Update lead stage (with automatic conversion when moving to 'asignado')
 */
export async function updateLeadStage(
  leadId: string, 
  newStage: LeadStage,
  responsibleId?: string | null
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      return { success: false, error: 'Lead not found' }
    }

    // If moving to 'asignado' from 'por_asignar', convert to business
    if (newStage === LEAD_STAGES.ASIGNADO && lead.stage === LEAD_STAGES.POR_ASIGNAR) {
      // Validate required fields for business creation
      if (!lead.name || !lead.contactName || !lead.contactEmail || !lead.contactPhone) {
        return { 
          success: false, 
          error: 'Cannot convert to business: Missing required fields (name, contact name, email, phone)' 
        }
      }

      // Check if a responsible is being assigned
      const assignedResponsible = responsibleId || lead.responsibleId
      if (!assignedResponsible) {
        return { 
          success: false, 
          error: 'Cannot move to "Asignado": Please assign a responsible user first' 
        }
      }

      // Convert to business
      const result = await convertLeadToBusiness(leadId, assignedResponsible)
      if (!result.success) {
        return result
      }

      // Update the responsible ID if provided
      if (responsibleId && responsibleId !== lead.responsibleId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { responsibleId },
        })
      }

      return { success: true, data: result.data }
    }

    // For other stage changes, just update the stage
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { 
        stage: newStage,
        ...(responsibleId !== undefined && { responsibleId }),
      },
      include: {
        category: true,
        business: true,
      },
    })

    invalidateEntity('leads')

    return { success: true, data: updatedLead }
  } catch (error) {
    return handleServerActionError(error, 'updateLeadStage')
  }
}

/**
 * Get all sales users for responsible dropdown
 */
export async function getLeadResponsibleUsers() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const users = await prisma.userProfile.findMany({
      where: {
        role: { in: ['admin', 'sales'] },
      },
      select: {
        clerkId: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    })

    return { success: true, data: users }
  } catch (error) {
    return handleServerActionError(error, 'getLeadResponsibleUsers')
  }
}

