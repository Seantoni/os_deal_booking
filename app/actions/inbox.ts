'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { parseFieldComments } from '@/types'

// Types
export interface InboxItem {
  id: string
  type: 'opportunity_comment' | 'opportunity_mention' | 'marketing_comment' | 'marketing_mention' | 'booking_mention'
  commentId: string
  author: {
    clerkId: string
    name: string | null
    email: string | null
  }
  content: string
  createdAt: Date
  entityId: string
  entityName: string
  entityType: 'opportunity' | 'marketing' | 'booking_request'
  linkUrl: string
}

interface AuthorProfile {
  clerkId: string
  name: string | null
  email: string | null
}

/**
 * Get inbox items for the current user (OPTIMIZED)
 * 
 * All users (including Admin): See comments where they are mentioned OR are responsible for the opportunity
 * 
 * Filtered by: user hasn't responded
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
    // Note: We intentionally don't check role here - inbox is always user-centric

    // ============================================
    // BATCH FETCH: User's latest responses (to filter out answered comments)
    // ============================================
    const [userOppLatestResponses, userMktLatestResponses] = await Promise.all([
      prisma.opportunityComment.groupBy({
        by: ['opportunityId'],
        where: { userId, isDeleted: false },
        _max: { createdAt: true },
      }),
      prisma.marketingOptionComment.groupBy({
        by: ['optionId'],
        where: { userId, isDeleted: false },
        _max: { createdAt: true },
      }),
    ])

    const userOppLatestMap = new Map<string, Date>()
    for (const row of userOppLatestResponses) {
      if (row._max.createdAt) {
        userOppLatestMap.set(row.opportunityId, row._max.createdAt)
      }
    }

    const userMktLatestMap = new Map<string, Date>()
    for (const row of userMktLatestResponses) {
      if (row._max.createdAt) {
        userMktLatestMap.set(row.optionId, row._max.createdAt)
      }
    }

    // Helper: Check if user responded after a specific date
    const hasUserRespondedToOpp = (opportunityId: string, afterDate: Date): boolean => {
      const latest = userOppLatestMap.get(opportunityId)
      return latest ? latest > afterDate : false
    }

    const hasUserRespondedToMkt = (optionId: string, afterDate: Date): boolean => {
      const latest = userMktLatestMap.get(optionId)
      return latest ? latest > afterDate : false
    }

    // ============================================
    // FETCH: Opportunity comments
    // ============================================
    
    // Get relevant comments from others:
    // - User is responsible/creator of the opportunity OR mentioned in the comment
    const oppComments = await prisma.opportunityComment.findMany({
      where: {
        isDeleted: false,
        userId: { not: userId },
        OR: [
          { mentions: { array_contains: [userId] } },
          {
            opportunity: {
              OR: [{ responsibleId: userId }, { userId: userId }],
            },
          },
        ],
      },
      select: {
        id: true,
        userId: true,
        content: true,
        mentions: true,
        dismissedBy: true,
        createdAt: true,
        opportunityId: true,
        opportunity: {
          select: {
            id: true,
            responsibleId: true,
            userId: true,
            business: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // ============================================
    // FETCH: Marketing comments (only if user is mentioned)
    // ============================================
    
    const allMktComments = await prisma.marketingOptionComment.findMany({
      where: {
        isDeleted: false,
        userId: { not: userId },
        mentions: { array_contains: [userId] },
      },
      select: {
        id: true,
        userId: true,
        content: true,
        mentions: true,
        dismissedBy: true,
        createdAt: true,
        optionId: true,
        option: {
          select: {
            campaign: {
              select: {
                id: true,
                bookingRequest: {
                  select: { merchant: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Filter: only show if user is mentioned
    const mktComments = allMktComments.filter((comment) => {
      const mentions = (comment.mentions as string[]) || []
      return mentions.includes(userId)
    })

    // ============================================
    // FETCH: Booking request field comments (mentions only)
    // ============================================
    const bookingRequestsWithComments = await prisma.bookingRequest.findMany({
      where: {
        fieldComments: { not: Prisma.JsonNull },
      },
      select: {
        id: true,
        name: true,
        merchant: true,
        fieldComments: true,
      },
    })

    const bookingComments = bookingRequestsWithComments.flatMap((request) => {
      const comments = parseFieldComments(request.fieldComments)
      return comments
        .filter((comment) => {
          if (comment.authorId === userId) return false
          const mentions = comment.mentions || []
          if (!mentions.includes(userId)) return false
          const dismissedBy = comment.dismissedBy || []
          if (dismissedBy.includes(userId)) return false
          return true
        })
        .map((comment) => ({
          id: comment.id,
          userId: comment.authorId,
          content: comment.text,
          createdAt: new Date(comment.createdAt),
          requestId: request.id,
          requestName: request.merchant || request.name,
        }))
    })

    if (oppComments.length === 0 && mktComments.length === 0 && bookingComments.length === 0) {
      return { success: true, data: [] }
    }

    // ============================================
    // BATCH FETCH: Author profiles
    // ============================================
    
    const authorIds = new Set<string>()
    oppComments.forEach((c: typeof oppComments[number]) => authorIds.add(c.userId))
    mktComments.forEach((c: typeof mktComments[number]) => authorIds.add(c.userId))
    bookingComments.forEach((c) => authorIds.add(c.userId))

    const authorProfiles = await prisma.userProfile.findMany({
      where: { clerkId: { in: Array.from(authorIds) } },
      select: { clerkId: true, name: true, email: true },
    })

    const authorMap = new Map<string, AuthorProfile>()
    for (const profile of authorProfiles) {
      authorMap.set(profile.clerkId, profile)
    }

    const getAuthor = (authorId: string): AuthorProfile => {
      return authorMap.get(authorId) || { clerkId: authorId, name: null, email: null }
    }

    // ============================================
    // BUILD INBOX ITEMS
    // ============================================
    
    const inboxItems: InboxItem[] = []

    // Process opportunity comments
    for (const comment of oppComments) {
      // Skip if user has responded after this comment
      if (hasUserRespondedToOpp(comment.opportunityId, comment.createdAt)) continue

      // Skip if user has dismissed this comment
      const dismissedBy = (comment.dismissedBy as string[]) || []
      if (dismissedBy.includes(userId)) continue

      const mentions = (comment.mentions as string[]) || []
      const isMentioned = mentions.includes(userId)

      inboxItems.push({
        id: `opp_${comment.id}`,
        type: isMentioned ? 'opportunity_mention' : 'opportunity_comment',
        commentId: comment.id,
        author: getAuthor(comment.userId),
        content: comment.content,
        createdAt: comment.createdAt,
        entityId: comment.opportunityId,
        entityName: comment.opportunity.business?.name || 'Oportunidad',
        entityType: 'opportunity',
        linkUrl: `/opportunities?open=${comment.opportunityId}&tab=chat`,
      })
    }

    // Process marketing comments
    for (const comment of mktComments) {
      // Skip if user has responded after this comment
      if (hasUserRespondedToMkt(comment.optionId, comment.createdAt)) continue

      // Skip if user has dismissed this comment
      const dismissedBy = (comment.dismissedBy as string[]) || []
      if (dismissedBy.includes(userId)) continue

      const mentions = (comment.mentions as string[]) || []
      const isMentioned = mentions.includes(userId)
      const campaign = comment.option.campaign
      const businessName = campaign.bookingRequest.merchant || campaign.bookingRequest.name

      inboxItems.push({
        id: `mkt_${comment.id}`,
        type: isMentioned ? 'marketing_mention' : 'marketing_comment',
        commentId: comment.id,
        author: getAuthor(comment.userId),
        content: comment.content,
        createdAt: comment.createdAt,
        entityId: campaign.id,
        entityName: businessName,
        entityType: 'marketing',
        linkUrl: `/marketing?open=${campaign.id}&option=${comment.optionId}`,
      })
    }

    // Process booking request field comments (mentions only)
    for (const comment of bookingComments) {
      inboxItems.push({
        id: `booking_${comment.id}`,
        type: 'booking_mention',
        commentId: comment.id,
        author: getAuthor(comment.userId),
        content: comment.content,
        createdAt: comment.createdAt,
        entityId: comment.requestId,
        entityName: comment.requestName || 'Solicitud',
        entityType: 'booking_request',
        linkUrl: `/deals?request=${comment.requestId}&comment=${comment.id}`,
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
 * Get unread inbox count (OPTIMIZED - reuses getInboxItems logic but lighter)
 * 
 * Note: For better performance with large datasets, consider implementing
 * a separate count-only query. Current implementation is acceptable for
 * moderate data volumes.
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

  try {
    // Reuse getInboxItems for simplicity - the batched queries make it efficient
    const inboxResult = await getInboxItems()
    if (!inboxResult.success || !inboxResult.data) {
      return { success: true, data: 0 }
    }

    return { success: true, data: inboxResult.data.length }
  } catch (error) {
    return handleServerActionError(error, 'getUnreadInboxCount')
  }
}

/**
 * Dismiss an inbox item (mark as done)
 * Adds the current user to the dismissedBy array
 */
export async function dismissInboxItem(
  commentId: string,
  entityType: 'opportunity' | 'marketing' | 'booking_request'
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
    if (entityType === 'opportunity') {
      const comment = await prisma.opportunityComment.findUnique({
        where: { id: commentId },
        select: { dismissedBy: true },
      })
      
      if (!comment) {
        return { success: false, error: 'Comentario no encontrado' }
      }
      
      const dismissedBy = (comment.dismissedBy as string[]) || []
      if (!dismissedBy.includes(userId)) {
        await prisma.opportunityComment.update({
          where: { id: commentId },
          data: { dismissedBy: [...dismissedBy, userId] },
        })
      }
    } else if (entityType === 'marketing') {
      const comment = await prisma.marketingOptionComment.findUnique({
        where: { id: commentId },
        select: { dismissedBy: true },
      })
      
      if (!comment) {
        return { success: false, error: 'Comentario no encontrado' }
      }
      
      const dismissedBy = (comment.dismissedBy as string[]) || []
      if (!dismissedBy.includes(userId)) {
        await prisma.marketingOptionComment.update({
          where: { id: commentId },
          data: { dismissedBy: [...dismissedBy, userId] },
        })
      }
    } else {
      const requestsWithComments = await prisma.bookingRequest.findMany({
        where: {
          fieldComments: { not: Prisma.JsonNull },
        },
        select: {
          id: true,
          fieldComments: true,
        },
      })

      let updated = false
      for (const request of requestsWithComments) {
        const comments = parseFieldComments(request.fieldComments)
        const commentIndex = comments.findIndex(c => c.id === commentId)
        if (commentIndex === -1) continue

        const dismissedBy = comments[commentIndex].dismissedBy || []
        if (!dismissedBy.includes(userId)) {
          comments[commentIndex] = {
            ...comments[commentIndex],
            dismissedBy: [...dismissedBy, userId],
          }
          await prisma.bookingRequest.update({
            where: { id: request.id },
            data: { fieldComments: comments as unknown as Prisma.InputJsonValue },
          })
        }
        updated = true
        break
      }

      if (!updated) {
        return { success: false, error: 'Comentario no encontrado' }
      }
    }

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'dismissInboxItem')
  }
}
