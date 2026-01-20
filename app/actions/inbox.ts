'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'

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
  entityId: string
  entityName: string
  entityType: 'opportunity' | 'marketing'
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
    // BATCH FETCH: User's responses (to filter out answered comments)
    // ============================================
    
    // Get all user's opportunity comments (for response checking)
    const userOppComments = await prisma.opportunityComment.findMany({
      where: { userId, isDeleted: false },
      select: { opportunityId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    
    // Build a map: opportunityId -> earliest response date
    const userOppResponseMap = new Map<string, Date>()
    for (const c of userOppComments) {
      const existing = userOppResponseMap.get(c.opportunityId)
      if (!existing || c.createdAt < existing) {
        userOppResponseMap.set(c.opportunityId, c.createdAt)
      }
    }

    // Get all user's marketing comments
    const userMktComments = await prisma.marketingOptionComment.findMany({
      where: { userId, isDeleted: false },
      select: { optionId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    
    // Build a map: optionId -> earliest response date
    const userMktResponseMap = new Map<string, Date>()
    for (const c of userMktComments) {
      const existing = userMktResponseMap.get(c.optionId)
      if (!existing || c.createdAt < existing) {
        userMktResponseMap.set(c.optionId, c.createdAt)
      }
    }

    // Helper: Check if user responded after a specific date
    const hasUserRespondedToOpp = (opportunityId: string, afterDate: Date): boolean => {
      // Get all user comments for this opportunity and check if any is after the date
      const userResponses = userOppComments.filter(
        (c: { opportunityId: string; createdAt: Date }) => 
          c.opportunityId === opportunityId && c.createdAt > afterDate
      )
      return userResponses.length > 0
    }

    const hasUserRespondedToMkt = (optionId: string, afterDate: Date): boolean => {
      const userResponses = userMktComments.filter(
        (c: { optionId: string; createdAt: Date }) => 
          c.optionId === optionId && c.createdAt > afterDate
      )
      return userResponses.length > 0
    }

    // ============================================
    // FETCH: Opportunity comments
    // ============================================
    
    // Get opportunities where user is responsible/creator
      const userOppIds = await prisma.opportunity.findMany({
        where: {
          OR: [{ responsibleId: userId }, { userId: userId }],
        },
        select: { id: true },
      })
      const userOppIdSet = new Set(userOppIds.map(o => o.id))

      // Get all comments from others
      const allOppComments = await prisma.opportunityComment.findMany({
        where: {
          isDeleted: false,
          userId: { not: userId },
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

      // Filter: user is responsible/creator OR is mentioned
    const oppComments = allOppComments.filter((comment) => {
        const mentions = (comment.mentions as string[]) || []
        const isResponsible = userOppIdSet.has(comment.opportunityId)
        const isMentioned = mentions.includes(userId)
        return isResponsible || isMentioned
      })

    // ============================================
    // FETCH: Marketing comments (only if user is mentioned)
    // ============================================
    
    const allMktComments = await prisma.marketingOptionComment.findMany({
      where: {
        isDeleted: false,
        userId: { not: userId },
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
    // BATCH FETCH: Author profiles
    // ============================================
    
    const authorIds = new Set<string>()
    oppComments.forEach((c: typeof oppComments[number]) => authorIds.add(c.userId))
    mktComments.forEach((c: typeof mktComments[number]) => authorIds.add(c.userId))

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
  entityType: 'opportunity' | 'marketing'
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
    } else {
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
    }

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'dismissInboxItem')
  }
}
