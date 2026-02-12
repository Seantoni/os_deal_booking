'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { parseFieldComments } from '@/types'
import { getInboxItemsForUser, type InboxItem } from '@/lib/inbox/get-inbox-items'

export type { InboxItem } from '@/lib/inbox/get-inbox-items'

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
    const inboxItems = await getInboxItemsForUser(userId)
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
    const inboxItems = await getInboxItemsForUser(authResult.userId)
    return { success: true, data: inboxItems.length }
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
