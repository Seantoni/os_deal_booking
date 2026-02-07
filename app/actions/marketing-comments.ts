'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { logger } from '@/lib/logger'

// Types
export interface CommentAttachment {
  url: string
  filename: string
  type: string
  size: number
}

export interface CommentAuthor {
  clerkId: string
  name: string | null
  email: string | null
}

export interface CommentWithAuthor {
  id: string
  optionId: string
  userId: string
  content: string
  mentions: string[] | null
  reactions: Record<string, string[]> | null
  attachments: CommentAttachment[] | null
  isEdited: boolean
  editedAt: Date | null
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  author: CommentAuthor | null
}

/**
 * Get all comments for a marketing option
 */
export async function getOptionComments(optionId: string): Promise<{
  success: boolean
  data?: CommentWithAuthor[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const comments = await prisma.marketingOptionComment.findMany({
      where: {
        optionId,
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
    const commentsWithAuthors: CommentWithAuthor[] = comments.map((comment: {
      id: string
      optionId: string
      userId: string
      content: string
      mentions: unknown
      reactions: unknown
      attachments: unknown
      isEdited: boolean
      editedAt: Date | null
      isDeleted: boolean
      createdAt: Date
      updatedAt: Date
    }) => ({
      id: comment.id,
      optionId: comment.optionId,
      userId: comment.userId,
      content: comment.content,
      mentions: comment.mentions as string[] | null,
      reactions: comment.reactions as Record<string, string[]> | null,
      attachments: comment.attachments as CommentAttachment[] | null,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: userMap.get(comment.userId) || null,
    }))

    return { success: true, data: commentsWithAuthors }
  } catch (error) {
    return handleServerActionError(error, 'getOptionComments')
  }
}

/**
 * Create a new comment on a marketing option
 */
export async function createOptionComment(
  optionId: string,
  data: {
    content: string
    mentions?: string[]
    attachments?: CommentAttachment[]
  }
): Promise<{
  success: boolean
  data?: CommentWithAuthor
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Verify the option exists
    const option = await prisma.marketingOption.findUnique({
      where: { id: optionId },
      include: {
        campaign: {
          include: {
            bookingRequest: {
              select: {
                merchant: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!option) {
      return { success: false, error: 'Marketing option not found' }
    }

    // Create the comment
    const comment = await prisma.marketingOptionComment.create({
      data: {
        optionId,
        userId,
        content: data.content,
        mentions: data.mentions || [],
        attachments: data.attachments ? JSON.parse(JSON.stringify(data.attachments)) : [],
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
        sendMentionNotifications({
          commentId: comment.id,
          authorId: userId,
          authorName: author?.name || author?.email || 'Someone',
          mentionedUserIds: data.mentions,
          content: data.content,
          optionId,
          optionType: option.optionType,
          platform: option.platform,
          businessName: option.campaign.bookingRequest.merchant || option.campaign.bookingRequest.name,
          campaignId: option.campaignId,
        }).catch(err => {
          logger.error('Error sending mention notifications:', err)
        })
      } else {
        logger.info('Mention notification emails are disabled - skipping email send')
      }
    }

    const commentWithAuthor: CommentWithAuthor = {
      id: comment.id,
      optionId: comment.optionId,
      userId: comment.userId,
      content: comment.content,
      mentions: comment.mentions as string[] | null,
      reactions: comment.reactions as Record<string, string[]> | null,
      attachments: comment.attachments as CommentAttachment[] | null,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author,
    }

    return { success: true, data: commentWithAuthor }
  } catch (error) {
    return handleServerActionError(error, 'createOptionComment')
  }
}

/**
 * Update a comment (edit content)
 */
export async function updateOptionComment(
  commentId: string,
  data: {
    content: string
    mentions?: string[]
  }
): Promise<{
  success: boolean
  data?: CommentWithAuthor
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Verify ownership
    const existingComment = await prisma.marketingOptionComment.findUnique({
      where: { id: commentId },
    })

    if (!existingComment) {
      return { success: false, error: 'Comment not found' }
    }

    if (existingComment.userId !== userId) {
      return { success: false, error: 'You can only edit your own comments' }
    }

    if (existingComment.isDeleted) {
      return { success: false, error: 'Cannot edit a deleted comment' }
    }

    // Update the comment
    const existingMentions = existingComment.mentions as string[] | null
    const comment = await prisma.marketingOptionComment.update({
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

    const commentWithAuthor: CommentWithAuthor = {
      id: comment.id,
      optionId: comment.optionId,
      userId: comment.userId,
      content: comment.content,
      mentions: comment.mentions as string[] | null,
      reactions: comment.reactions as Record<string, string[]> | null,
      attachments: comment.attachments as CommentAttachment[] | null,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author,
    }

    return { success: true, data: commentWithAuthor }
  } catch (error) {
    return handleServerActionError(error, 'updateOptionComment')
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteOptionComment(commentId: string): Promise<{
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
    const existingComment = await prisma.marketingOptionComment.findUnique({
      where: { id: commentId },
    })

    if (!existingComment) {
      return { success: false, error: 'Comment not found' }
    }

    if (existingComment.userId !== userId) {
      return { success: false, error: 'You can only delete your own comments' }
    }

    // Soft delete
    await prisma.marketingOptionComment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteOptionComment')
  }
}

/**
 * Toggle a reaction on a comment
 * Also auto-dismisses the comment from inbox when adding a reaction
 */
export async function toggleCommentReaction(
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
    const comment = await prisma.marketingOptionComment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      return { success: false, error: 'Comment not found' }
    }

    if (comment.isDeleted) {
      return { success: false, error: 'Cannot react to a deleted comment' }
    }

    // Get current reactions and dismissedBy
    const currentReactions = (comment.reactions as Record<string, string[]>) || {}
    const dismissedBy = (comment.dismissedBy as string[]) || []

    // Toggle user's reaction
    const emojiReactions = currentReactions[emoji] || []
    const userIndex = emojiReactions.indexOf(userId)
    const isAddingReaction = userIndex < 0

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

    // Build update data
    const updateData: { reactions: Record<string, string[]>; dismissedBy?: string[] } = {
      reactions: currentReactions,
    }

    // Auto-dismiss from inbox when adding a reaction (not when removing)
    if (isAddingReaction && !dismissedBy.includes(userId)) {
      updateData.dismissedBy = [...dismissedBy, userId]
    }

    // Update the comment
    await prisma.marketingOptionComment.update({
      where: { id: commentId },
      data: updateData,
    })

    return { success: true, data: currentReactions }
  } catch (error) {
    return handleServerActionError(error, 'toggleCommentReaction')
  }
}

/**
 * Add attachment to a comment
 */
export async function addCommentAttachment(
  commentId: string,
  attachment: CommentAttachment
): Promise<{
  success: boolean
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const comment = await prisma.marketingOptionComment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      return { success: false, error: 'Comment not found' }
    }

    if (comment.userId !== userId) {
      return { success: false, error: 'You can only add attachments to your own comments' }
    }

    const currentAttachments = (comment.attachments as unknown as CommentAttachment[]) || []
    const newAttachments = [...currentAttachments, attachment]

    await prisma.marketingOptionComment.update({
      where: { id: commentId },
      data: {
        attachments: JSON.parse(JSON.stringify(newAttachments)),
      },
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'addCommentAttachment')
  }
}

/**
 * Get users for mention dropdown
 */
export async function getUsersForMention(search?: string): Promise<{
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
    return handleServerActionError(error, 'getUsersForMention')
  }
}

// ============================================================================
// Email Notification Helper (internal)
// ============================================================================

interface MentionNotificationData {
  commentId: string
  authorId: string
  authorName: string
  mentionedUserIds: string[]
  content: string
  optionId: string
  optionType: string
  platform: string
  businessName: string
  campaignId: string
}

/**
 * Send email notifications to mentioned users
 * This is called asynchronously after creating a comment
 */
async function sendMentionNotifications(data: MentionNotificationData): Promise<void> {
  // Import dynamically to avoid circular deps
  const { sendMentionNotificationEmail } = await import('@/lib/email/services/mention-notification')

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

  const authorName = author?.name || author?.email?.split('@')[0] || 'Someone'

  // Send email to each mentioned user
  for (const user of mentionedUsers) {
    if (!user.email) continue

    // Don't notify the author if they mentioned themselves
    if (user.clerkId === data.authorId) continue

    try {
      await sendMentionNotificationEmail({
        to: user.email,
        mentionedUserName: user.name || user.email.split('@')[0],
        authorName,
        content: data.content,
        optionType: data.optionType,
        platform: data.platform,
        businessName: data.businessName,
        campaignId: data.campaignId,
      })

      logger.info(`Mention notification sent to ${user.email}`)
    } catch (err) {
      logger.error(`Failed to send mention notification to ${user.email}:`, err)
    }
  }
}
