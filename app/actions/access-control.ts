'use server'

// Access control server actions for managing user permissions and invitations
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/utils/server-actions'
import { validateAndNormalizeEmail } from '@/lib/auth/email-validation'
import { invalidateEntity } from '@/lib/cache'
import { addToClerkAllowlist, removeFromClerkAllowlist } from '@/lib/clerk-allowlist'
import { USER_ROLE_VALUES, type UserRole } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { handleServerActionError } from '@/lib/utils/server-actions'

// Type for Clerk API errors
interface ClerkError {
  message?: string
  longMessage?: string
  clerkError?: boolean
  status?: number
  errors?: Array<{ message?: string; longMessage?: string }>
}

/**
 * Check if an email has access to the application
 */
export async function checkEmailAccess(email: string): Promise<boolean> {
  try {
    const normalizedEmail = validateAndNormalizeEmail(email)
    
    const allowedEmail = await prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail },
    })
    
    return allowedEmail?.isActive === true
  } catch (error) {
    logger.error('Error checking email access:', error)
    return false
  }
}

/**
 * Get all allowed emails (admin only)
 */
export async function getAllowedEmails() {
  try {
    await requireAdmin()
    
    const allowedEmails = await prisma.allowedEmail.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        auditLogs: {
          orderBy: { performedAt: 'desc' },
          take: 1, // Get most recent audit log
        },
      },
    })
    
    return { success: true, data: allowedEmails }
  } catch (error) {
    return handleServerActionError(error, 'getAllowedEmails')
  }
}

/**
 * Add email to allowlist (admin only)
 */
export async function addAllowedEmail(email: string, notes?: string) {
  try {
    const adminResult = await requireAdmin()
    if (!('userId' in adminResult)) {
      return adminResult
    }
    const { userId } = adminResult
    
    const normalizedEmail = validateAndNormalizeEmail(email)
    
    // Check if email already exists
    const existing = await prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail },
    })
    
    if (existing) {
      // If exists but inactive, reactivate it
      if (!existing.isActive) {
        const updated = await prisma.allowedEmail.update({
          where: { email: normalizedEmail },
          data: {
            isActive: true,
            updatedAt: new Date(),
          },
        })
        
        // Create audit log for reactivation
        await prisma.accessAuditLog.create({
          data: {
            email: normalizedEmail,
            action: 'reactivated',
            performedBy: userId,
            notes,
            allowedEmailId: updated.id,
          },
        })
        
        // Sync to Clerk allowlist
        const clerkResult = await addToClerkAllowlist(normalizedEmail)
        if (!clerkResult.success) {
          logger.warn('[access-control] Failed to sync to Clerk allowlist:', clerkResult.error)
          // Continue anyway - database is source of truth
        }
        
        invalidateEntity('access-control')
        return { success: true, action: 'reactivated' as const }
      } else {
        return { success: false, error: 'Email is already in the allowlist' }
      }
    }
    
    // Create new allowed email
    const allowedEmail = await prisma.allowedEmail.create({
      data: {
        email: normalizedEmail,
        isActive: true,
        notes,
        createdBy: userId,
      },
    })
    
    // Create audit log for granting access
    await prisma.accessAuditLog.create({
      data: {
        email: normalizedEmail,
        action: 'granted',
        performedBy: userId,
        notes,
        allowedEmailId: allowedEmail.id,
      },
    })
    
    // Sync to Clerk allowlist
    const clerkResult = await addToClerkAllowlist(normalizedEmail)
    if (!clerkResult.success) {
      logger.warn('[access-control] Failed to sync to Clerk allowlist:', clerkResult.error)
      // Continue anyway - database is source of truth
    }
    
    invalidateEntity('access-control')
    return { success: true, action: 'granted' as const }
  } catch (error) {
    return handleServerActionError(error, 'addAllowedEmail')
  }
}

/**
 * Revoke access for an email (admin only)
 */
export async function revokeAccess(email: string, notes?: string) {
  try {
    const adminResult = await requireAdmin()
    if (!('userId' in adminResult)) {
      return adminResult
    }
    const { userId } = adminResult
    
    const normalizedEmail = validateAndNormalizeEmail(email)
    
    // Find the allowed email
    const allowedEmail = await prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail },
    })
    
    if (!allowedEmail) {
      return { success: false, error: 'Email not found in allowlist' }
    }
    
    if (!allowedEmail.isActive) {
      return { success: false, error: 'Email access is already revoked' }
    }
    
    // Soft delete: set isActive to false
    await prisma.allowedEmail.update({
      where: { email: normalizedEmail },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })
    
    // Create audit log for revocation
    await prisma.accessAuditLog.create({
      data: {
        email: normalizedEmail,
        action: 'revoked',
        performedBy: userId,
        notes,
        allowedEmailId: allowedEmail.id,
      },
    })
    
    // Sync to Clerk allowlist
    const clerkResult = await removeFromClerkAllowlist(normalizedEmail)
    if (!clerkResult.success) {
      logger.warn('[access-control] Failed to sync to Clerk allowlist:', clerkResult.error)
      // Continue anyway - database is source of truth
    }
    
    invalidateEntity('access-control')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'revokeAccess')
  }
}

/**
 * Reactivate access for a revoked email (admin only)
 */
export async function reactivateAccess(email: string, notes?: string) {
  try {
    const adminResult = await requireAdmin()
    if (!('userId' in adminResult)) {
      return adminResult
    }
    const { userId } = adminResult
    
    const normalizedEmail = validateAndNormalizeEmail(email)
    
    // Find the allowed email
    const allowedEmail = await prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail },
    })
    
    if (!allowedEmail) {
      return { success: false, error: 'Email not found in allowlist' }
    }
    
    if (allowedEmail.isActive) {
      return { success: false, error: 'Email access is already active' }
    }
    
    // Reactivate
    await prisma.allowedEmail.update({
      where: { email: normalizedEmail },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    })
    
    // Create audit log for reactivation
    await prisma.accessAuditLog.create({
      data: {
        email: normalizedEmail,
        action: 'reactivated',
        performedBy: userId,
        notes,
        allowedEmailId: allowedEmail.id,
      },
    })
    
    // Sync to Clerk allowlist (add back when reactivating)
    const clerkResult = await addToClerkAllowlist(normalizedEmail)
    if (!clerkResult.success) {
      logger.warn('[access-control] Failed to sync to Clerk allowlist:', clerkResult.error)
      // Continue anyway - database is source of truth
    }
    
    invalidateEntity('access-control')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'reactivateAccess')
  }
}

/**
 * Get audit logs for access control (admin only)
 */
export async function getAccessAuditLogs(email?: string, limit: number = 100) {
  try {
    await requireAdmin()
    
    const logs = await prisma.accessAuditLog.findMany({
      where: email ? { email: validateAndNormalizeEmail(email) } : undefined,
      orderBy: { performedAt: 'desc' },
      take: limit,
      include: {
        allowedEmail: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    })
    
    return { success: true, data: logs }
  } catch (error) {
    return handleServerActionError(error, 'getAccessAuditLogs')
  }
}

// Export types for use in components
export type AllowedEmail = {
  id: string
  email: string
  isActive: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: string
  invitedRole: string | null
  invitationStatus: string | null
  invitedAt: Date | null
  invitedBy: string | null
  clerkInvitationId: string | null
  auditLogs: AccessAuditLog[]
}

export type AccessAuditLog = {
  id: string
  email: string
  action: string // 'granted' | 'revoked' | 'reactivated' | 'invited' | 'invitation_accepted'
  performedBy: string
  performedAt: Date
  notes: string | null
  allowedEmailId: string | null
}

/**
 * Grandfather existing users: Add all existing UserProfile emails to AllowedEmail
 * This should be run once during migration
 */
export async function grandfatherExistingUsers() {
  const adminResult = await requireAdmin()
  if (!('userId' in adminResult)) {
    return adminResult
  }
  const { userId } = adminResult
  
  // Get all UserProfile emails that exist
  const userProfiles = await prisma.userProfile.findMany({
    where: {
      email: {
        not: null,
      },
    },
    select: {
      email: true,
    },
  })
  
  const emails = userProfiles
    .map((profile) => profile.email)
    .filter((email): email is string => email !== null)
  
  let added = 0
  let skipped = 0
  
  for (const email of emails) {
    try {
      const normalizedEmail = validateAndNormalizeEmail(email)
      
      // Check if already exists
      const existing = await prisma.allowedEmail.findUnique({
        where: { email: normalizedEmail },
      })
      
      if (existing) {
        skipped++
        continue
      }
      
      // Create allowed email
      const allowedEmail = await prisma.allowedEmail.create({
        data: {
          email: normalizedEmail,
          isActive: true,
          createdBy: userId,
          notes: 'Grandfathered during migration',
        },
      })
      
      // Create audit log
      await prisma.accessAuditLog.create({
        data: {
          email: normalizedEmail,
          action: 'granted',
          performedBy: userId,
          notes: 'Grandfathered during migration',
          allowedEmailId: allowedEmail.id,
        },
      })
      
      added++
    } catch (error) {
      logger.error(`Error adding email ${email}:`, error)
      skipped++
    }
  }
  
  return { added, skipped, total: emails.length }
}

/**
 * Invite a user via Clerk's invitation API (admin only)
 * This will:
 * 1. Add email to allowlist
 * 2. Send Clerk invitation email
 * 3. Store invitation details with role assignment
 */
export async function inviteUser(
  email: string, 
  role: UserRole, 
  options?: { notes?: string; firstName?: string; lastName?: string }
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  const { notes, firstName, lastName } = options || {}
  
  const adminResult = await requireAdmin()
  if (!('userId' in adminResult)) {
    return { success: false, error: 'No autorizado - se requiere rol de administrador' }
  }
  const { userId } = adminResult
  
  // Validate role
  if (!USER_ROLE_VALUES.includes(role)) {
    return { success: false, error: `Rol inválido: ${role}. Debe ser uno de: ${USER_ROLE_VALUES.join(', ')}` }
  }
  
  let normalizedEmail: string
  try {
    normalizedEmail = validateAndNormalizeEmail(email)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Email inválido' }
  }
  
  // Check if email already exists
  const existing = await prisma.allowedEmail.findUnique({
    where: { email: normalizedEmail },
  })
  
  if (existing) {
    // If exists and has pending invitation, don't allow duplicate
    if (existing.invitationStatus === 'pending') {
      return { success: false, error: 'Ya existe una invitación pendiente para este correo' }
    }
    
    // If exists but inactive, reactivate it
    if (!existing.isActive) {
      // Update existing record with invitation details
      const updated = await prisma.allowedEmail.update({
        where: { email: normalizedEmail },
        data: {
          isActive: true,
          invitedRole: role,
          invitationStatus: 'pending',
          invitedAt: new Date(),
          invitedBy: userId,
          updatedAt: new Date(),
          firstName: firstName || null,
          lastName: lastName || null,
        },
      })
      
      // Create invitation via Clerk
      try {
        const clerk = await clerkClient()
        
        // Check if email already exists as a Clerk user
        try {
          const users = await clerk.users.getUserList({ emailAddress: [normalizedEmail] })
          if (users.data && users.data.length > 0) {
            // Rollback changes
            await prisma.allowedEmail.update({
              where: { email: normalizedEmail },
              data: {
                invitationStatus: null,
                invitedRole: null,
                invitedAt: null,
                invitedBy: null,
              },
            })
            return { success: false, error: 'Este correo ya está registrado como usuario en el sistema' }
          }
        } catch (checkError) {
          // If it's our custom error about registration, return it
          if (checkError instanceof Error && checkError.message.includes('already registered')) {
            return { success: false, error: 'Este correo ya está registrado como usuario en el sistema' }
          }
          // Otherwise, continue - the email might not exist yet
        }
        
        // Add to Clerk allowlist BEFORE creating invitation (required by Clerk)
        const clerkResult = await addToClerkAllowlist(normalizedEmail)
        if (!clerkResult.success) {
          logger.warn('[access-control] Failed to sync to Clerk allowlist:', clerkResult.error)
        }
        
        const invitation = await clerk.invitations.createInvitation({
          emailAddress: normalizedEmail,
        })
        
        // Update with Clerk invitation ID
        await prisma.allowedEmail.update({
          where: { email: normalizedEmail },
          data: {
            clerkInvitationId: invitation.id,
          },
        })
        
        // Create audit log
        await prisma.accessAuditLog.create({
          data: {
            email: normalizedEmail,
            action: 'invited',
            performedBy: userId,
            notes: `Invited with role: ${role}. ${notes || ''}`,
            allowedEmailId: updated.id,
          },
        })
        
        invalidateEntity('access-control')
        return { success: true, invitationId: invitation.id }
      } catch (err) {
        const clerkError = err as ClerkError
        logger.error('[access-control] Error creating Clerk invitation:', clerkError)
        
        // Extract more detailed error message from Clerk
        let errorMessage = 'Error al enviar la invitación'
        if (clerkError.clerkError) {
          if (clerkError.errors && Array.isArray(clerkError.errors) && clerkError.errors.length > 0) {
            errorMessage = clerkError.errors.map((e) => e.message || e.longMessage || '').filter(Boolean).join('. ') || errorMessage
          } else if (clerkError.longMessage) {
            errorMessage = clerkError.longMessage
          } else if (clerkError.message) {
            errorMessage = clerkError.message
          }
          
          // Handle specific Clerk error codes
          if (clerkError.status === 422) {
            if (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('exists')) {
              errorMessage = 'Este correo ya está registrado o tiene una invitación pendiente'
            } else {
              errorMessage = `Correo o solicitud de invitación inválida: ${errorMessage}`
            }
          }
        } else if (clerkError.message) {
          errorMessage = clerkError.message
        }
        
        // Rollback the invitation status
        await prisma.allowedEmail.update({
          where: { email: normalizedEmail },
          data: {
            invitationStatus: null,
            invitedRole: null,
            invitedAt: null,
            invitedBy: null,
          },
        })
        return { success: false, error: errorMessage }
      }
    } else {
      return { success: false, error: 'Este correo ya está en la lista de permitidos y activo' }
    }
  }
  
  // Create new allowed email with invitation
  try {
    const clerk = await clerkClient()
    
    // Check if email already exists as a Clerk user
    try {
      const users = await clerk.users.getUserList({ emailAddress: [normalizedEmail] })
      if (users.data && users.data.length > 0) {
        return { success: false, error: 'Este correo ya está registrado como usuario en el sistema' }
      }
    } catch (checkError) {
      // If it's our custom error about registration, return it
      if (checkError instanceof Error && checkError.message.includes('already registered')) {
        return { success: false, error: 'Este correo ya está registrado como usuario en el sistema' }
      }
      // Otherwise, continue - the email might not exist yet
    }
    
    // First, add to allowlist
    const allowedEmail = await prisma.allowedEmail.create({
      data: {
        email: normalizedEmail,
        isActive: true,
        notes,
        createdBy: userId,
        invitedRole: role,
        invitationStatus: 'pending',
        invitedAt: new Date(),
        invitedBy: userId,
        firstName: firstName || null,
        lastName: lastName || null,
      },
    })
    
    // Add to Clerk allowlist BEFORE creating invitation (required by Clerk)
    const clerkResult = await addToClerkAllowlist(normalizedEmail)
    if (!clerkResult.success) {
      logger.warn('[access-control] Failed to sync to Clerk allowlist:', clerkResult.error)
      // Continue anyway - might still work
    }
    
    // Create invitation via Clerk
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: normalizedEmail,
    })
    
    // Update with Clerk invitation ID
    await prisma.allowedEmail.update({
      where: { email: normalizedEmail },
      data: {
        clerkInvitationId: invitation.id,
      },
    })
    
    // Create audit log
    await prisma.accessAuditLog.create({
      data: {
        email: normalizedEmail,
        action: 'invited',
        performedBy: userId,
        notes: `Invited with role: ${role}. ${notes || ''}`,
        allowedEmailId: allowedEmail.id,
      },
    })
    
    invalidateEntity('access-control')
    return { success: true, invitationId: invitation.id }
  } catch (err) {
    const clerkError = err as ClerkError
    logger.error('[access-control] Error creating Clerk invitation:', clerkError)
    
    // Extract more detailed error message from Clerk
    let errorMessage = 'Error al enviar la invitación'
    if (clerkError.clerkError) {
      if (clerkError.errors && Array.isArray(clerkError.errors) && clerkError.errors.length > 0) {
        errorMessage = clerkError.errors.map((e) => e.message || e.longMessage || '').filter(Boolean).join('. ') || errorMessage
      } else if (clerkError.longMessage) {
        errorMessage = clerkError.longMessage
      } else if (clerkError.message) {
        errorMessage = clerkError.message
      }
      
      // Handle specific Clerk error codes
      if (clerkError.status === 422) {
        if (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('exists')) {
          errorMessage = 'Este correo ya está registrado o tiene una invitación pendiente'
        } else {
          errorMessage = `Correo o solicitud de invitación inválida: ${errorMessage}`
        }
      }
    } else if (clerkError.message) {
      errorMessage = clerkError.message
    }
    
    // Clean up the created record if invitation fails
    await prisma.allowedEmail.delete({
      where: { email: normalizedEmail },
    }).catch(() => {
      // Ignore cleanup errors
    })
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Resend an invitation - revokes existing Clerk invitation and creates a new one
 * Useful when the original invitation expired or there's a stale invitation in Clerk
 */
export async function resendInvitation(
  email: string
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  const adminResult = await requireAdmin()
  if (!('userId' in adminResult)) {
    return { success: false, error: 'No autorizado - se requiere rol de administrador' }
  }
  const { userId } = adminResult
  
  let normalizedEmail: string
  try {
    normalizedEmail = validateAndNormalizeEmail(email)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Email inválido' }
  }
  
  // Find existing record
  const existing = await prisma.allowedEmail.findUnique({
    where: { email: normalizedEmail },
  })
  
  if (!existing) {
    return { success: false, error: 'No se encontró una invitación para este correo' }
  }
  
  if (existing.invitationStatus === 'accepted') {
    return { success: false, error: 'Esta invitación ya fue aceptada' }
  }
  
  try {
    const clerk = await clerkClient()
    
    // Check if user already exists in Clerk
    try {
      const users = await clerk.users.getUserList({ emailAddress: [normalizedEmail] })
      if (users.data && users.data.length > 0) {
        return { success: false, error: 'Este correo ya está registrado como usuario en el sistema' }
      }
    } catch {
      // Continue - user might not exist
    }
    
    // Try to revoke existing Clerk invitation if we have one
    if (existing.clerkInvitationId) {
      try {
        await clerk.invitations.revokeInvitation(existing.clerkInvitationId)
        logger.info(`[access-control] Revoked existing invitation ${existing.clerkInvitationId} for ${normalizedEmail}`)
      } catch (revokeErr) {
        // Log but continue - invitation might already be revoked or expired
        logger.warn(`[access-control] Could not revoke invitation ${existing.clerkInvitationId}:`, revokeErr)
      }
    }
    
    // Also try to revoke any pending invitations in Clerk by email (in case ID is stale)
    try {
      const pendingInvitations = await clerk.invitations.getInvitationList({ 
        status: 'pending',
      })
      const matchingInvitation = pendingInvitations.data?.find(
        inv => inv.emailAddress.toLowerCase() === normalizedEmail.toLowerCase()
      )
      if (matchingInvitation && matchingInvitation.id !== existing.clerkInvitationId) {
        await clerk.invitations.revokeInvitation(matchingInvitation.id)
        logger.info(`[access-control] Revoked stale invitation ${matchingInvitation.id} for ${normalizedEmail}`)
      }
    } catch {
      // Continue - this is a best-effort cleanup
    }
    
    // Make sure email is in Clerk allowlist
    const clerkResult = await addToClerkAllowlist(normalizedEmail)
    if (!clerkResult.success) {
      logger.warn('[access-control] Failed to sync to Clerk allowlist:', clerkResult.error)
    }
    
    // Create new invitation
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: normalizedEmail,
    })
    
    // Update our record with new invitation ID
    await prisma.allowedEmail.update({
      where: { email: normalizedEmail },
      data: {
        clerkInvitationId: invitation.id,
        invitationStatus: 'pending',
        invitedAt: new Date(),
        invitedBy: userId,
        updatedAt: new Date(),
      },
    })
    
    // Create audit log
    await prisma.accessAuditLog.create({
      data: {
        email: normalizedEmail,
        action: 'invitation_resent',
        performedBy: userId,
        notes: `Invitation resent. Role: ${existing.invitedRole || 'unknown'}`,
        allowedEmailId: existing.id,
      },
    })
    
    invalidateEntity('access-control')
    return { success: true, invitationId: invitation.id }
  } catch (err) {
    const clerkError = err as ClerkError
    logger.error('[access-control] Error resending invitation:', clerkError)
    
    let errorMessage = 'Error al reenviar la invitación'
    if (clerkError.clerkError) {
      if (clerkError.errors && Array.isArray(clerkError.errors) && clerkError.errors.length > 0) {
        errorMessage = clerkError.errors.map((e) => e.message || e.longMessage || '').filter(Boolean).join('. ') || errorMessage
      } else if (clerkError.longMessage) {
        errorMessage = clerkError.longMessage
      } else if (clerkError.message) {
        errorMessage = clerkError.message
      }
    } else if (clerkError.message) {
      errorMessage = clerkError.message
    }
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Check if a user has a pending invitation and assign role on signup
 * This should be called after a user signs up via Clerk
 */
export async function processInvitationOnSignup(clerkId: string, email: string) {
  try {
    const normalizedEmail = validateAndNormalizeEmail(email)
    
    // Find pending invitation
    const invitation = await prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail },
    })
    
    if (invitation && invitation.invitationStatus === 'pending' && invitation.invitedRole) {
      // Build name from invitation data
      const invitedName = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ') || null
      
      // Update UserProfile with the invited role and name
      await prisma.userProfile.upsert({
        where: { clerkId },
        create: {
          clerkId,
          email: normalizedEmail,
          role: invitation.invitedRole,
          name: invitedName,
        },
        update: {
          role: invitation.invitedRole,
          email: normalizedEmail,
          // Only update name if we have invitation data and user doesn't have a name yet
          ...(invitedName ? { name: invitedName } : {}),
        },
      })
      
      // Update invitation status to accepted
      await prisma.allowedEmail.update({
        where: { email: normalizedEmail },
        data: {
          invitationStatus: 'accepted',
          updatedAt: new Date(),
        },
      })
      
      // Create audit log
      await prisma.accessAuditLog.create({
        data: {
          email: normalizedEmail,
          action: 'invitation_accepted',
          performedBy: clerkId,
          notes: `Invitation accepted. Role assigned: ${invitation.invitedRole}`,
          allowedEmailId: invitation.id,
        },
      })
      
      logger.info(`[access-control] Invitation accepted for ${normalizedEmail}, role assigned: ${invitation.invitedRole}`)
      return { success: true, role: invitation.invitedRole, name: invitedName }
    }
    
    return { success: false, message: 'No pending invitation found' }
  } catch (error) {
    logger.error('[access-control] Error processing invitation on signup:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

