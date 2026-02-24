'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError, ServerActionResponse } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'

// Types for pending comments (dashboard widget)
export interface PendingCommentItem {
  id: string
  type: 'opportunity' | 'marketing'
  author: {
    clerkId: string
    name: string | null
    email: string | null
  }
  content: string
  createdAt: Date
  entityId: string
  entityName: string
  linkUrl: string
}

// Types for comments log (settings tab)
export interface CommentLogItem {
  id: string
  type: 'opportunity' | 'marketing'
  author: {
    clerkId: string
    name: string | null
    email: string | null
  }
  content: string
  createdAt: Date
  entityId: string
  entityName: string
  mentions: string[]
  mentionNames: string[]
  dismissedBy: string[]
  dismissedByNames: string[]
  hasResponse: boolean
  responseBy: string | null
  responseByName: string | null
  responseDate: Date | null
}

export interface GetAllCommentsResponse {
  comments: CommentLogItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Get all comments (opportunity + marketing) for admin view
 * Sorted by createdAt descending (latest first)
 */
export async function getAllComments(
  page: number = 1,
  limit: number = 50
): Promise<ServerActionResponse<GetAllCommentsResponse>> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Check admin access
    const userRole = await getUserRole()
    if (userRole !== 'admin') {
      return { success: false, error: 'Solo administradores pueden ver todos los comentarios' }
    }

    const offset = (page - 1) * limit

    // Fetch opportunity comments
    const [oppComments, oppCount] = await Promise.all([
      prisma.opportunityComment.findMany({
        where: { isDeleted: false },
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
              business: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.opportunityComment.count({ where: { isDeleted: false } }),
    ])

    // Fetch marketing comments
    const [mktComments, mktCount] = await Promise.all([
      prisma.marketingOptionComment.findMany({
        where: { isDeleted: false },
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.marketingOptionComment.count({ where: { isDeleted: false } }),
    ])

    // Collect all user IDs for batch lookup
    const allUserIds = new Set<string>()
    oppComments.forEach(c => {
      allUserIds.add(c.userId)
      const mentions = (c.mentions as string[]) || []
      mentions.forEach(m => allUserIds.add(m))
      const dismissedBy = (c.dismissedBy as string[]) || []
      dismissedBy.forEach(d => allUserIds.add(d))
    })
    mktComments.forEach(c => {
      allUserIds.add(c.userId)
      const mentions = (c.mentions as string[]) || []
      mentions.forEach(m => allUserIds.add(m))
      const dismissedBy = (c.dismissedBy as string[]) || []
      dismissedBy.forEach(d => allUserIds.add(d))
    })

    // Batch fetch user profiles
    const userProfiles = await prisma.userProfile.findMany({
      where: { clerkId: { in: Array.from(allUserIds) } },
      select: { clerkId: true, name: true, email: true },
    })

    const userMap = new Map<string, { name: string | null; email: string | null }>()
    userProfiles.forEach(u => userMap.set(u.clerkId, { name: u.name, email: u.email }))

    const getUser = (id: string) => userMap.get(id) || { name: null, email: null }
    const getUserName = (id: string) => {
      const user = getUser(id)
      return user.name || user.email || id
    }

    // Build response map for opportunity comments (check if any user responded)
    const oppResponseMap = new Map<string, { userId: string; createdAt: Date }>()
    
    // Group comments by opportunityId to find responses
    const oppCommentsByOpp = new Map<string, typeof oppComments>()
    oppComments.forEach(c => {
      const existing = oppCommentsByOpp.get(c.opportunityId) || []
      existing.push(c)
      oppCommentsByOpp.set(c.opportunityId, existing)
    })

    // For each comment, check if there's a later comment from a different user
    oppComments.forEach(comment => {
      const allCommentsForOpp = oppCommentsByOpp.get(comment.opportunityId) || []
      const responseComment = allCommentsForOpp.find(
        c => c.userId !== comment.userId && c.createdAt > comment.createdAt
      )
      if (responseComment) {
        oppResponseMap.set(comment.id, {
          userId: responseComment.userId,
          createdAt: responseComment.createdAt,
        })
      }
    })

    // Same for marketing comments
    const mktResponseMap = new Map<string, { userId: string; createdAt: Date }>()
    const mktCommentsByOption = new Map<string, typeof mktComments>()
    mktComments.forEach(c => {
      const existing = mktCommentsByOption.get(c.optionId) || []
      existing.push(c)
      mktCommentsByOption.set(c.optionId, existing)
    })

    mktComments.forEach(comment => {
      const allCommentsForOption = mktCommentsByOption.get(comment.optionId) || []
      const responseComment = allCommentsForOption.find(
        c => c.userId !== comment.userId && c.createdAt > comment.createdAt
      )
      if (responseComment) {
        mktResponseMap.set(comment.id, {
          userId: responseComment.userId,
          createdAt: responseComment.createdAt,
        })
      }
    })

    // Combine and transform comments
    const allComments: CommentLogItem[] = []

    oppComments.forEach(comment => {
      const mentions = (comment.mentions as string[]) || []
      const dismissedBy = (comment.dismissedBy as string[]) || []
      const response = oppResponseMap.get(comment.id)
      const author = getUser(comment.userId)

      allComments.push({
        id: comment.id,
        type: 'opportunity',
        author: {
          clerkId: comment.userId,
          name: author.name,
          email: author.email,
        },
        content: comment.content,
        createdAt: comment.createdAt,
        entityId: comment.opportunityId,
        entityName: comment.opportunity.business?.name || 'Oportunidad',
        mentions,
        mentionNames: mentions.map(m => getUserName(m)),
        dismissedBy,
        dismissedByNames: dismissedBy.map(d => getUserName(d)),
        hasResponse: !!response,
        responseBy: response?.userId || null,
        responseByName: response ? getUserName(response.userId) : null,
        responseDate: response?.createdAt || null,
      })
    })

    mktComments.forEach(comment => {
      const mentions = (comment.mentions as string[]) || []
      const dismissedBy = (comment.dismissedBy as string[]) || []
      const response = mktResponseMap.get(comment.id)
      const author = getUser(comment.userId)
      const businessName = comment.option.campaign.bookingRequest.merchant || comment.option.campaign.bookingRequest.name

      allComments.push({
        id: comment.id,
        type: 'marketing',
        author: {
          clerkId: comment.userId,
          name: author.name,
          email: author.email,
        },
        content: comment.content,
        createdAt: comment.createdAt,
        entityId: comment.option.campaign.id,
        entityName: businessName,
        mentions,
        mentionNames: mentions.map(m => getUserName(m)),
        dismissedBy,
        dismissedByNames: dismissedBy.map(d => getUserName(d)),
        hasResponse: !!response,
        responseBy: response?.userId || null,
        responseByName: response ? getUserName(response.userId) : null,
        responseDate: response?.createdAt || null,
      })
    })

    // Sort by createdAt descending (latest first)
    allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination
    const total = oppCount + mktCount
    const paginatedComments = allComments.slice(offset, offset + limit)

    return {
      success: true,
      data: {
        comments: paginatedComments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'getAllComments')
  }
}

/**
 * Get pending comments (those without a response) for dashboard widget.
 * Returns all comments that haven't received a response yet, sorted by oldest first.
 */
export async function getPendingComments(): Promise<ServerActionResponse<PendingCommentItem[]>> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Fetch all opportunity comments (not deleted, not from current user)
    const oppComments = await prisma.opportunityComment.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        userId: true,
        content: true,
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

    // Fetch all marketing comments (not deleted)
    const mktComments = await prisma.marketingOptionComment.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        userId: true,
        content: true,
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

    // Group comments by entity to find those without responses
    const oppCommentsByOpp = new Map<string, typeof oppComments>()
    oppComments.forEach(c => {
      const existing = oppCommentsByOpp.get(c.opportunityId) || []
      existing.push(c)
      oppCommentsByOpp.set(c.opportunityId, existing)
    })

    const mktCommentsByOption = new Map<string, typeof mktComments>()
    mktComments.forEach(c => {
      const existing = mktCommentsByOption.get(c.optionId) || []
      existing.push(c)
      mktCommentsByOption.set(c.optionId, existing)
    })

    // Find pending comments (no response from a different user after this comment)
    const pendingOppComments = oppComments.filter(comment => {
      const allCommentsForOpp = oppCommentsByOpp.get(comment.opportunityId) || []
      const hasResponse = allCommentsForOpp.some(
        c => c.userId !== comment.userId && c.createdAt > comment.createdAt
      )
      return !hasResponse
    })

    const pendingMktComments = mktComments.filter(comment => {
      const allCommentsForOption = mktCommentsByOption.get(comment.optionId) || []
      const hasResponse = allCommentsForOption.some(
        c => c.userId !== comment.userId && c.createdAt > comment.createdAt
      )
      return !hasResponse
    })

    // Collect all user IDs for batch lookup
    const allUserIds = new Set<string>()
    pendingOppComments.forEach(c => allUserIds.add(c.userId))
    pendingMktComments.forEach(c => allUserIds.add(c.userId))

    // Batch fetch user profiles
    const userProfiles = await prisma.userProfile.findMany({
      where: { clerkId: { in: Array.from(allUserIds) } },
      select: { clerkId: true, name: true, email: true },
    })

    const userMap = new Map<string, { name: string | null; email: string | null }>()
    userProfiles.forEach(u => userMap.set(u.clerkId, { name: u.name, email: u.email }))

    const getUser = (id: string) => userMap.get(id) || { name: null, email: null }

    // Build pending comments list
    const pendingComments: PendingCommentItem[] = []

    pendingOppComments.forEach(comment => {
      const author = getUser(comment.userId)
      pendingComments.push({
        id: comment.id,
        type: 'opportunity',
        author: {
          clerkId: comment.userId,
          name: author.name,
          email: author.email,
        },
        content: comment.content,
        createdAt: comment.createdAt,
        entityId: comment.opportunityId,
        entityName: comment.opportunity.business?.name || 'Oportunidad',
        linkUrl: `/opportunities?open=${comment.opportunityId}&tab=chat`,
      })
    })

    pendingMktComments.forEach(comment => {
      const author = getUser(comment.userId)
      const businessName = comment.option.campaign.bookingRequest.merchant || comment.option.campaign.bookingRequest.name
      pendingComments.push({
        id: comment.id,
        type: 'marketing',
        author: {
          clerkId: comment.userId,
          name: author.name,
          email: author.email,
        },
        content: comment.content,
        createdAt: comment.createdAt,
        entityId: comment.option.campaign.id,
        entityName: businessName,
        linkUrl: `/marketing?open=${comment.option.campaign.id}&option=${comment.optionId}`,
      })
    })

    // Sort by oldest first (comments waiting longest)
    pendingComments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    return {
      success: true,
      data: pendingComments,
    }
  } catch (error) {
    return handleServerActionError(error, 'getPendingComments')
  }
}
