'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'
import { logger } from '@/lib/logger'

// Types
export interface CommentAuthor {
  clerkId: string
  name: string | null
  email: string | null
}

export interface OpportunityCommentWithAuthor {
  id: string
  opportunityId: string
  userId: string
  content: string
  mentions: string[] | null
  reactions: Record<string, string[]> | null
  isEdited: boolean
  editedAt: Date | null
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  author: CommentAuthor | null
}

/**
 * Check if user can access opportunity comments
 * Only the responsible user and admins can view/comment
 */
async function canAccessOpportunityComments(opportunityId: string, userId: string): Promise<boolean> {
  const role = await getUserRole()
  if (role === 'admin') return true

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: { responsibleId: true, userId: true },
  })

  if (!opportunity) return false

  // Allow if user is the responsible or the creator
  return opportunity.responsibleId === userId || opportunity.userId === userId
}

/**
 * Get all comments for an opportunity
 */
export async function getOpportunityComments(opportunityId: string): Promise<{
  success: boolean
  data?: OpportunityCommentWithAuthor[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Check access
    const canAccess = await canAccessOpportunityComments(opportunityId, userId)
    if (!canAccess) {
      return { success: false, error: 'No tienes acceso a los comentarios de esta oportunidad' }
    }

    const comments = await prisma.opportunityComment.findMany({
      where: {
        opportunityId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Get unique user IDs
    const userIds = [...new Set(comments.map((c: { userId: string }) => c.userId))]

    // Fetch user profiles
    const userProfiles = await prisma.userProfile.findMany({
      where: {
        clerkId: { in: userIds as string[] },
      },
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
    })

    const userMap = new Map(userProfiles.map(u => [u.clerkId, u]))

    // Map comments with author info
    const commentsWithAuthors: OpportunityCommentWithAuthor[] = comments.map((comment: {
      id: string
      opportunityId: string
      userId: string
      content: string
      mentions: unknown
      reactions: unknown
      isEdited: boolean
      editedAt: Date | null
      isDeleted: boolean
      createdAt: Date
      updatedAt: Date
    }) => ({
      id: comment.id,
      opportunityId: comment.opportunityId,
      userId: comment.userId,
      content: comment.content,
      mentions: comment.mentions as string[] | null,
      reactions: comment.reactions as Record<string, string[]> | null,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: userMap.get(comment.userId) || null,
    }))

    return { success: true, data: commentsWithAuthors }
  } catch (error) {
    return handleServerActionError(error, 'getOpportunityComments')
  }
}

/**
 * Create a new comment on an opportunity
 */
export async function createOpportunityComment(
  opportunityId: string,
  data: {
    content: string
    mentions?: string[]
  }
): Promise<{
  success: boolean
  data?: OpportunityCommentWithAuthor
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Check access
    const canAccess = await canAccessOpportunityComments(opportunityId, userId)
    if (!canAccess) {
      return { success: false, error: 'No tienes permiso para comentar en esta oportunidad' }
    }

    // Verify the opportunity exists and get business info
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        business: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!opportunity) {
      return { success: false, error: 'Oportunidad no encontrada' }
    }

    // Create the comment
    const comment = await prisma.opportunityComment.create({
      data: {
        opportunityId,
        userId,
        content: data.content,
        mentions: data.mentions || [],
        readBy: [], // Initialize as empty array
      },
    })

    // Get author info
    const authorProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
    })

    const author: CommentAuthor | null = authorProfile ? {
      clerkId: authorProfile.clerkId,
      name: authorProfile.name,
      email: authorProfile.email,
    } : null

    // Send email notifications to mentioned users (async, don't wait)
    if (data.mentions && data.mentions.length > 0) {
      // Check if email notifications are enabled
      const { ENABLE_MENTION_NOTIFICATION_EMAILS } = await import('@/lib/email/config')
      if (ENABLE_MENTION_NOTIFICATION_EMAILS) {
        sendOpportunityMentionNotifications({
          commentId: comment.id,
          authorId: userId,
          authorName: author?.name || author?.email || 'Alguien',
          mentionedUserIds: data.mentions,
          content: data.content,
          opportunityId,
          businessName: opportunity.business.name,
        }).catch(err => {
          logger.error('Error sending opportunity mention notifications:', err)
        })
      } else {
        logger.info('Mention notification emails are disabled - skipping email send')
      }
    }

    const commentWithAuthor: OpportunityCommentWithAuthor = {
      id: comment.id,
      opportunityId: comment.opportunityId,
      userId: comment.userId,
      content: comment.content,
      mentions: comment.mentions as string[] | null,
      reactions: comment.reactions as Record<string, string[]> | null,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author,
    }

    return { success: true, data: commentWithAuthor }
  } catch (error) {
    return handleServerActionError(error, 'createOpportunityComment')
  }
}

/**
 * Update a comment (edit content)
 */
export async function updateOpportunityComment(
  commentId: string,
  data: {
    content: string
    mentions?: string[]
  }
): Promise<{
  success: boolean
  data?: OpportunityCommentWithAuthor
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Verify ownership
    const existingComment = await prisma.opportunityComment.findUnique({
      where: { id: commentId },
    })

    if (!existingComment) {
      return { success: false, error: 'Comentario no encontrado' }
    }

    if (existingComment.userId !== userId) {
      return { success: false, error: 'Solo puedes editar tus propios comentarios' }
    }

    if (existingComment.isDeleted) {
      return { success: false, error: 'No se puede editar un comentario eliminado' }
    }

    // Update the comment
    const existingMentions = existingComment.mentions as string[] | null
    const comment = await prisma.opportunityComment.update({
      where: { id: commentId },
      data: {
        content: data.content,
        mentions: data.mentions || existingMentions || [],
        isEdited: true,
        editedAt: new Date(),
      },
    })

    // Get author info
    const authorProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
    })

    const author: CommentAuthor | null = authorProfile ? {
      clerkId: authorProfile.clerkId,
      name: authorProfile.name,
      email: authorProfile.email,
    } : null

    const commentWithAuthor: OpportunityCommentWithAuthor = {
      id: comment.id,
      opportunityId: comment.opportunityId,
      userId: comment.userId,
      content: comment.content,
      mentions: comment.mentions as string[] | null,
      reactions: comment.reactions as Record<string, string[]> | null,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author,
    }

    return { success: true, data: commentWithAuthor }
  } catch (error) {
    return handleServerActionError(error, 'updateOpportunityComment')
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteOpportunityComment(commentId: string): Promise<{
  success: boolean
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Verify ownership
    const existingComment = await prisma.opportunityComment.findUnique({
      where: { id: commentId },
    })

    if (!existingComment) {
      return { success: false, error: 'Comentario no encontrado' }
    }

    if (existingComment.userId !== userId) {
      return { success: false, error: 'Solo puedes eliminar tus propios comentarios' }
    }

    // Soft delete
    await prisma.opportunityComment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteOpportunityComment')
  }
}

/**
 * Toggle a reaction on a comment
 */
export async function toggleOpportunityCommentReaction(
  commentId: string,
  emoji: string
): Promise<{
  success: boolean
  data?: Record<string, string[]>
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const comment = await prisma.opportunityComment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      return { success: false, error: 'Comentario no encontrado' }
    }

    if (comment.isDeleted) {
      return { success: false, error: 'No se puede reaccionar a un comentario eliminado' }
    }

    // Get current reactions
    const currentReactions = (comment.reactions as Record<string, string[]>) || {}

    // Toggle user's reaction
    const emojiReactions = currentReactions[emoji] || []
    const userIndex = emojiReactions.indexOf(userId)

    if (userIndex >= 0) {
      // Remove reaction
      emojiReactions.splice(userIndex, 1)
      if (emojiReactions.length === 0) {
        delete currentReactions[emoji]
      } else {
        currentReactions[emoji] = emojiReactions
      }
    } else {
      // Add reaction
      currentReactions[emoji] = [...emojiReactions, userId]
    }

    // Update the comment
    await prisma.opportunityComment.update({
      where: { id: commentId },
      data: {
        reactions: currentReactions,
      },
    })

    return { success: true, data: currentReactions }
  } catch (error) {
    return handleServerActionError(error, 'toggleOpportunityCommentReaction')
  }
}

/**
 * Get users for mention dropdown (reuse from marketing-comments)
 */
export async function getUsersForOpportunityMention(search?: string): Promise<{
  success: boolean
  data?: CommentAuthor[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const users = await prisma.userProfile.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
      take: 10,
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: users }
  } catch (error) {
    return handleServerActionError(error, 'getUsersForOpportunityMention')
  }
}

// ============================================================================
// Email Notification Helper (internal)
// ============================================================================

interface OpportunityMentionNotificationData {
  commentId: string
  authorId: string
  authorName: string
  mentionedUserIds: string[]
  content: string
  opportunityId: string
  businessName: string
}

/**
 * Send email notifications to mentioned users
 * This is called asynchronously after creating a comment
 */
async function sendOpportunityMentionNotifications(data: OpportunityMentionNotificationData): Promise<void> {
  // Import dynamically to avoid circular deps
  const { sendOpportunityMentionNotificationEmail } = await import('@/lib/email/services/opportunity-mention-notification')

  // Get mentioned users' emails
  const mentionedUsers = await prisma.userProfile.findMany({
    where: {
      clerkId: { in: data.mentionedUserIds },
    },
    select: {
      clerkId: true,
      name: true,
      email: true,
    },
  })

  // Get author info
  const author = await prisma.userProfile.findUnique({
    where: { clerkId: data.authorId },
    select: {
      name: true,
      email: true,
    },
  })

  const authorName = author?.name || author?.email?.split('@')[0] || 'Alguien'

  // Send email to each mentioned user
  for (const user of mentionedUsers) {
    if (!user.email) continue

    // Don't notify the author if they mentioned themselves
    if (user.clerkId === data.authorId) continue

    try {
      await sendOpportunityMentionNotificationEmail({
        to: user.email,
        mentionedUserName: user.name || user.email.split('@')[0],
        authorName,
        content: data.content,
        opportunityId: data.opportunityId,
        businessName: data.businessName,
      })

      logger.info(`Opportunity mention notification sent to ${user.email}`)
    } catch (err) {
      logger.error(`Failed to send opportunity mention notification to ${user.email}:`, err)
    }
  }
}

