'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'
import { logger } from '@/lib/logger'

// Types
export interface InboxItem {
  id: string
  type: 'opportunity_comment' | 'opportunity_mention' | 'marketing_comment' | 'marketing_mention'
  commentId: string
  author: {
    clerkId: string
    name: string | null
    email: string | null
  }
  content: string
  createdAt: Date
  // Context
  entityId: string // opportunityId or campaignId
  entityName: string // business name or campaign name
  entityType: 'opportunity' | 'marketing'
  // Link info
  linkUrl: string // URL to open the entity
}

/**
 * Get inbox items for the current user
 * 
 * Admins: See ALL comments (not their own)
 * Others: See comments where they are mentioned OR are responsible for the opportunity
 * 
 * Filtered by: not read AND not responded
 */
export async function getInboxItems(): Promise<{
  success: boolean
  data?: InboxItem[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Get user role to determine access level
    const userRole = await getUserRole()
    const isAdmin = userRole === 'admin'

    const inboxItems: InboxItem[] = []
    const processedCommentIds = new Set<string>()

    // Helper function to get author profile
    const getAuthorProfile = async (authorId: string) => {
      const profile = await prisma.userProfile.findUnique({
        where: { clerkId: authorId },
        select: {
          clerkId: true,
          name: true,
          email: true,
        },
      })
      return profile || { clerkId: authorId, name: null, email: null }
    }

    // Helper function to check if user has responded to a comment
    const hasUserRespondedToOppComment = async (opportunityId: string, afterDate: Date) => {
      const response = await prisma.opportunityComment.findFirst({
        where: {
          opportunityId,
          userId,
          createdAt: { gt: afterDate },
          isDeleted: false,
        },
      })
      return !!response
    }

    const hasUserRespondedToMktComment = async (optionId: string, afterDate: Date) => {
      const response = await prisma.marketingOptionComment.findFirst({
        where: {
          optionId,
          userId,
          createdAt: { gt: afterDate },
          isDeleted: false,
        },
      })
      return !!response
    }

    // ============================================
    // 1. OPPORTUNITY COMMENTS
    // ============================================

    if (isAdmin) {
      // ADMIN: Get ALL opportunity comments (not their own)
      const allOppComments = await prisma.opportunityComment.findMany({
        where: {
          isDeleted: false,
          userId: { not: userId },
        },
        include: {
          opportunity: {
            include: {
              business: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      for (const comment of allOppComments) {
        const mentions = (comment.mentions as string[]) || []
        const isMentioned = mentions.includes(userId)

        // Only remove from inbox when user has responded (commented after this comment)
        const hasResponded = await hasUserRespondedToOppComment(comment.opportunityId, comment.createdAt)
        if (hasResponded) continue

        processedCommentIds.add(comment.id)
        const authorProfile = await getAuthorProfile(comment.userId)

        inboxItems.push({
          id: `opp_${comment.id}`,
          type: isMentioned ? 'opportunity_mention' : 'opportunity_comment',
          commentId: comment.id,
          author: authorProfile,
          content: comment.content,
          createdAt: comment.createdAt,
          entityId: comment.opportunityId,
          entityName: comment.opportunity.business?.name || 'Oportunidad',
          entityType: 'opportunity',
          linkUrl: `/opportunities?open=${comment.opportunityId}&tab=chat`,
        })
      }
    } else {
      // NON-ADMIN: Get comments where user is responsible/creator
      const userOpportunities = await prisma.opportunity.findMany({
        where: {
          OR: [
            { responsibleId: userId },
            { userId: userId },
          ],
        },
        include: {
          business: {
            select: { name: true },
          },
          comments: {
            where: {
              isDeleted: false,
              userId: { not: userId },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      for (const opp of userOpportunities) {
        for (const comment of opp.comments) {
          const mentions = (comment.mentions as string[]) || []
          const isMentioned = mentions.includes(userId)

          // Only remove from inbox when user has responded
          const hasResponded = await hasUserRespondedToOppComment(opp.id, comment.createdAt)
          if (hasResponded) continue

          processedCommentIds.add(comment.id)
          const authorProfile = await getAuthorProfile(comment.userId)

          inboxItems.push({
            id: `opp_${comment.id}`,
            type: isMentioned ? 'opportunity_mention' : 'opportunity_comment',
            commentId: comment.id,
            author: authorProfile,
            content: comment.content,
            createdAt: comment.createdAt,
            entityId: opp.id,
            entityName: opp.business?.name || 'Oportunidad',
            entityType: 'opportunity',
            linkUrl: `/opportunities?open=${opp.id}&tab=chat`,
          })
        }
      }

      // NON-ADMIN: Also get comments where user is MENTIONED (in opportunities they don't own)
      const mentionedComments = await prisma.opportunityComment.findMany({
        where: {
          isDeleted: false,
          userId: { not: userId },
        },
        include: {
          opportunity: {
            include: {
              business: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      for (const comment of mentionedComments) {
        // Skip if already processed
        if (processedCommentIds.has(comment.id)) continue

        const mentions = (comment.mentions as string[]) || []
        const isMentioned = mentions.includes(userId)

        // Only include if user is mentioned
        if (!isMentioned) continue

        // Only remove from inbox when user has responded
        const hasResponded = await hasUserRespondedToOppComment(comment.opportunityId, comment.createdAt)
        if (hasResponded) continue

        processedCommentIds.add(comment.id)
        const authorProfile = await getAuthorProfile(comment.userId)

        inboxItems.push({
          id: `opp_${comment.id}`,
          type: 'opportunity_mention',
          commentId: comment.id,
          author: authorProfile,
          content: comment.content,
          createdAt: comment.createdAt,
          entityId: comment.opportunityId,
          entityName: comment.opportunity.business?.name || 'Oportunidad',
          entityType: 'opportunity',
          linkUrl: `/opportunities?open=${comment.opportunityId}&tab=chat`,
        })
      }
    }

    // ============================================
    // 2. MARKETING COMMENTS
    // ============================================

    const allMarketingComments = await prisma.marketingOptionComment.findMany({
      where: {
        isDeleted: false,
        userId: { not: userId },
      },
      include: {
        option: {
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
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    for (const comment of allMarketingComments) {
      const mentions = (comment.mentions as string[]) || []
      const isMentioned = mentions.includes(userId)

      // Admin sees all, non-admin only sees if mentioned
      if (!isAdmin && !isMentioned) continue

      // Only remove from inbox when user has responded
      const hasResponded = await hasUserRespondedToMktComment(comment.optionId, comment.createdAt)
      if (hasResponded) continue

      const authorProfile = await getAuthorProfile(comment.userId)
      const campaign = comment.option.campaign
      const businessName = campaign.bookingRequest.merchant || campaign.bookingRequest.name

      inboxItems.push({
        id: `mkt_${comment.id}`,
        type: isMentioned ? 'marketing_mention' : 'marketing_comment',
        commentId: comment.id,
        author: authorProfile,
        content: comment.content,
        createdAt: comment.createdAt,
        entityId: campaign.id,
        entityName: businessName,
        entityType: 'marketing',
        linkUrl: `/marketing?open=${campaign.id}`,
      })
    }

    // Sort by date (oldest first)
    inboxItems.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    return { success: true, data: inboxItems }
  } catch (error) {
    return handleServerActionError(error, 'getInboxItems')
  }
}

/**
 * Mark a comment as read
 */
export async function markCommentAsRead(
  commentId: string,
  type: 'opportunity' | 'marketing'
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
    if (type === 'opportunity') {
      const comment = await prisma.opportunityComment.findUnique({
        where: { id: commentId },
        select: { readBy: true },
      })

      if (!comment) {
        return { success: false, error: 'Comment not found' }
      }

      const readBy = ((comment.readBy as string[]) || []).filter(Boolean)
      if (!readBy.includes(userId)) {
        readBy.push(userId)
      }

      await prisma.opportunityComment.update({
        where: { id: commentId },
        data: { readBy },
      })
    } else {
      const comment = await prisma.marketingOptionComment.findUnique({
        where: { id: commentId },
        select: { readBy: true },
      })

      if (!comment) {
        return { success: false, error: 'Comment not found' }
      }

      const readBy = ((comment.readBy as string[]) || []).filter(Boolean)
      if (!readBy.includes(userId)) {
        readBy.push(userId)
      }

      await prisma.marketingOptionComment.update({
        where: { id: commentId },
        data: { readBy },
      })
    }

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'markCommentAsRead')
  }
}

/**
 * Mark all inbox items as read (when user opens inbox)
 * Uses same logic as getInboxItems to determine which comments to mark
 */
export async function markAllInboxAsRead(): Promise<{
  success: boolean
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Get user role to determine access level
    const userRole = await getUserRole()
    const isAdmin = userRole === 'admin'

    // Get all opportunity comments
    const opportunityComments = await prisma.opportunityComment.findMany({
      where: {
        isDeleted: false,
        userId: { not: userId },
      },
      select: {
        id: true,
        readBy: true,
        opportunity: {
          select: {
            responsibleId: true,
            userId: true,
          },
        },
        mentions: true,
      },
    })

    for (const comment of opportunityComments) {
      const readBy = ((comment.readBy as string[]) || []).filter(Boolean)
      const mentions = ((comment.mentions as string[]) || []).filter(Boolean)
      const isMentioned = mentions.includes(userId)
      const isResponsible = comment.opportunity.responsibleId === userId || comment.opportunity.userId === userId

      // Admin marks all, others only if mentioned or responsible
      const shouldMark = isAdmin || isMentioned || isResponsible

      if (shouldMark && !readBy.includes(userId)) {
        readBy.push(userId)
        await prisma.opportunityComment.update({
          where: { id: comment.id },
          data: { readBy },
        })
      }
    }

    // Get all marketing comments
    const allMarketingComments = await prisma.marketingOptionComment.findMany({
      where: {
        isDeleted: false,
        userId: { not: userId },
      },
      select: {
        id: true,
        readBy: true,
        mentions: true,
      },
    })

    for (const comment of allMarketingComments) {
      const readBy = ((comment.readBy as string[]) || []).filter(Boolean)
      const mentions = ((comment.mentions as string[]) || []).filter(Boolean)
      const isMentioned = mentions.includes(userId)

      // Admin marks all, others only if mentioned
      const shouldMark = isAdmin || isMentioned

      if (shouldMark && !readBy.includes(userId)) {
        readBy.push(userId)
        await prisma.marketingOptionComment.update({
          where: { id: comment.id },
          data: { readBy },
        })
      }
    }

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'markAllInboxAsRead')
  }
}

/**
 * Get unread inbox count
 */
export async function getUnreadInboxCount(): Promise<{
  success: boolean
  data?: number
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const inboxResult = await getInboxItems()
    if (!inboxResult.success || !inboxResult.data) {
      return { success: true, data: 0 }
    }

    return { success: true, data: inboxResult.data.length }
  } catch (error) {
    return handleServerActionError(error, 'getUnreadInboxCount')
  }
}

