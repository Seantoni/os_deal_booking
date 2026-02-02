/**
 * Entity-level access control helpers
 * 
 * Provides utilities for checking if a user can access specific items
 * combining role-based and entity-based permissions.
 */

import { prisma } from '@/lib/prisma'
import { getUserProfile, isAdmin } from './roles'
import type { EntityType, AccessLevel } from '@/app/actions/access-control'

export type { EntityType, AccessLevel }

/**
 * Check if the current user can access a specific entity
 * 
 * Access is granted if:
 * 1. User is admin (sees everything)
 * 2. User has explicit EntityAccess grant
 * 3. User is assigned to the entity (e.g., salesRep, createdBy)
 * 
 * @param entityType - Type of entity ('business', 'opportunity', etc.)
 * @param entityId - ID of the specific entity
 * @param options - Additional checks (e.g., requireLevel: 'edit')
 * @returns Object with canAccess boolean and accessLevel
 */
export async function canAccessEntity(
  entityType: EntityType,
  entityId: string,
  options?: { requireLevel?: AccessLevel }
): Promise<{ canAccess: boolean; accessLevel: AccessLevel | 'admin' | null; reason: string }> {
  try {
    // Check if user is admin
    const admin = await isAdmin()
    if (admin) {
      return { canAccess: true, accessLevel: 'admin', reason: 'admin' }
    }
    
    // Get current user
    const profile = await getUserProfile()
    if (!profile) {
      return { canAccess: false, accessLevel: null, reason: 'not_authenticated' }
    }
    
    // Check explicit entity access
    const entityAccess = await prisma.entityAccess.findUnique({
      where: {
        userId_entityType_entityId: {
          userId: profile.id,
          entityType,
          entityId,
        },
      },
      select: {
        accessLevel: true,
        expiresAt: true,
      },
    })
    
    if (entityAccess) {
      // Check expiration
      if (entityAccess.expiresAt && entityAccess.expiresAt < new Date()) {
        // Expired - continue to other checks
      } else {
        const level = entityAccess.accessLevel as AccessLevel
        
        // Check if required level is met
        if (options?.requireLevel) {
          const levelHierarchy: Record<AccessLevel, number> = {
            view: 1,
            edit: 2,
            manage: 3,
          }
          if (levelHierarchy[level] >= levelHierarchy[options.requireLevel]) {
            return { canAccess: true, accessLevel: level, reason: 'entity_access' }
          }
        } else {
          return { canAccess: true, accessLevel: level, reason: 'entity_access' }
        }
      }
    }
    
    // Check entity-specific assignments
    const assigned = await checkEntityAssignment(entityType, entityId, profile.id)
    if (assigned) {
      return { canAccess: true, accessLevel: 'edit', reason: 'assigned' }
    }
    
    return { canAccess: false, accessLevel: null, reason: 'no_access' }
  } catch (error) {
    console.error('[entity-access] Error checking access:', error)
    return { canAccess: false, accessLevel: null, reason: 'error' }
  }
}

/**
 * Check if user is assigned to an entity through entity-specific relationships
 * (e.g., salesRep for Business, createdBy for BookingRequest)
 */
async function checkEntityAssignment(
  entityType: EntityType,
  entityId: string,
  userProfileId: string
): Promise<boolean> {
  // Get user's clerkId for queries that use it
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { clerkId: true },
  })
  
  if (!profile) return false
  
  switch (entityType) {
    case 'business': {
      // Check if user is a sales rep for this business
      // salesRepId in BusinessSalesRep refers to UserProfile.clerkId
      const assignment = await prisma.businessSalesRep.findFirst({
        where: {
          businessId: entityId,
          salesRepId: profile.clerkId,
        },
      })
      return !!assignment
    }
    
    case 'opportunity': {
      // Check if user owns this opportunity or is assigned to the linked business
      const opportunity = await prisma.opportunity.findUnique({
        where: { id: entityId },
        include: {
          business: {
            include: {
              salesReps: {
                where: { salesRepId: profile.clerkId },
              },
            },
          },
        },
      })
      
      if (!opportunity) return false
      
      // Check if user created the opportunity
      if (profile.clerkId === opportunity.userId) return true
      // Check if user is sales rep for the linked business
      if (opportunity.business?.salesReps.length) return true
      
      return false
    }
    
    case 'bookingRequest': {
      // Check if user created this request
      const request = await prisma.bookingRequest.findUnique({
        where: { id: entityId },
        select: { userId: true },
      })
      
      return profile.clerkId === request?.userId
    }
    
    case 'deal': {
      // Deals inherit access from their booking request
      const deal = await prisma.deal.findUnique({
        where: { id: entityId },
        include: {
          bookingRequest: {
            select: { userId: true },
          },
        },
      })
      
      return profile.clerkId === deal?.bookingRequest?.userId
    }
    
    case 'eventLead': {
      // Check if user is assigned to the promoter business
      const eventLead = await prisma.eventLead.findUnique({
        where: { id: entityId },
        include: {
          promoterBusiness: {
            include: {
              salesReps: {
                where: { salesRepId: profile.clerkId },
              },
            },
          },
        },
      })
      
      return !!eventLead?.promoterBusiness?.salesReps?.length
    }
    
    default:
      return false
  }
}

/**
 * Get IDs of entities the current user can access
 * Combines explicit grants with assignments
 * 
 * @param entityType - Type of entity
 * @returns Array of entity IDs the user can access, or null if admin (can access all)
 */
export async function getAccessibleIds(
  entityType: EntityType
): Promise<string[] | null> {
  try {
    // Admin can see everything
    const admin = await isAdmin()
    if (admin) {
      return null // null means no restriction
    }
    
    const profile = await getUserProfile()
    if (!profile) {
      return []
    }
    
    const ids = new Set<string>()
    
    // Get explicit entity access grants
    const grants = await prisma.entityAccess.findMany({
      where: {
        userId: profile.id,
        entityType,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { entityId: true },
    })
    
    grants.forEach((g: { entityId: string }) => ids.add(g.entityId))
    
    // Get assigned entities based on type
    switch (entityType) {
      case 'business': {
        // salesRepId in BusinessSalesRep refers to UserProfile.clerkId
        const assignments = await prisma.businessSalesRep.findMany({
          where: {
            salesRepId: profile.clerkId,
          },
          select: { businessId: true },
        })
        assignments.forEach(a => ids.add(a.businessId))
        break
      }
      
      case 'opportunity': {
        // Opportunities user created
        const created = await prisma.opportunity.findMany({
          where: { userId: profile.clerkId },
          select: { id: true },
        })
        created.forEach(o => ids.add(o.id))
        
        // Opportunities linked to assigned businesses
        const businessAssignments = await prisma.businessSalesRep.findMany({
          where: {
            salesRepId: profile.clerkId,
          },
          select: { businessId: true },
        })
        
        if (businessAssignments.length > 0) {
          const linkedOpps = await prisma.opportunity.findMany({
            where: {
              businessId: { in: businessAssignments.map(b => b.businessId) },
            },
            select: { id: true },
          })
          linkedOpps.forEach(o => ids.add(o.id))
        }
        break
      }
      
      case 'bookingRequest': {
        const requests = await prisma.bookingRequest.findMany({
          where: { userId: profile.clerkId },
          select: { id: true },
        })
        requests.forEach(r => ids.add(r.id))
        break
      }
      
      case 'deal': {
        const deals = await prisma.deal.findMany({
          where: {
            bookingRequest: {
              userId: profile.clerkId,
            },
          },
          select: { id: true },
        })
        deals.forEach(d => ids.add(d.id))
        break
      }
      
      case 'eventLead': {
        // Event leads linked to assigned businesses
        const businessAssignments = await prisma.businessSalesRep.findMany({
          where: {
            salesRepId: profile.clerkId,
          },
          select: { businessId: true },
        })
        
        if (businessAssignments.length > 0) {
          const linkedLeads = await prisma.eventLead.findMany({
            where: {
              promoterBusinessId: { in: businessAssignments.map(b => b.businessId) },
            },
            select: { id: true },
          })
          linkedLeads.forEach(l => ids.add(l.id))
        }
        break
      }
    }
    
    return Array.from(ids)
  } catch (error) {
    console.error('[entity-access] Error getting accessible IDs:', error)
    return []
  }
}

/**
 * Build a Prisma where clause to filter entities by access
 * Returns null if user is admin (no filtering needed)
 * 
 * @param entityType - Type of entity
 * @returns Prisma where clause or null
 */
export async function buildAccessFilter(
  entityType: EntityType
): Promise<{ id: { in: string[] } } | null> {
  const ids = await getAccessibleIds(entityType)
  
  if (ids === null) {
    return null // Admin - no filter needed
  }
  
  return { id: { in: ids } }
}
