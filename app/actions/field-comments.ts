'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole, isAdmin as checkIsAdmin } from '@/lib/auth/roles'
import { currentUser } from '@clerk/nextjs/server'
import { invalidateEntity } from '@/lib/cache'
import { parseFieldComments, type FieldComment } from '@/types'
import { randomUUID } from 'crypto'

/**
 * Get all field comments for a booking request
 */
export async function getFieldComments(requestId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      select: { fieldComments: true },
    })

    if (!request) {
      return { success: false, error: 'Booking request not found' }
    }

    const comments = parseFieldComments(request.fieldComments)
    return { success: true, data: comments }
  } catch (error) {
    return handleServerActionError(error, 'getFieldComments')
  }
}

/**
 * Add a new comment to a field
 */
export async function addFieldComment(
  requestId: string,
  fieldKey: string,
  text: string
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Get current user info for author details
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Get existing comments
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      select: { fieldComments: true },
    })

    if (!request) {
      return { success: false, error: 'Booking request not found' }
    }

    const existingComments = parseFieldComments(request.fieldComments)

    // Create new comment
    const newComment: FieldComment = {
      id: randomUUID(),
      fieldKey,
      text: text.trim(),
      authorId: userId,
      authorName: user.fullName || user.firstName || null,
      authorEmail: user.emailAddresses[0]?.emailAddress || null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      editHistory: [],
    }

    // Add to array
    const updatedComments = [...existingComments, newComment]

    // Save to database
    await prisma.bookingRequest.update({
      where: { id: requestId },
      data: {
        fieldComments: updatedComments as unknown as Prisma.InputJsonValue,
      },
    })

    // Only invalidate booking-requests - comments are stored there, deals don't need refresh
    invalidateEntity('booking-requests')

    return { success: true, data: newComment }
  } catch (error) {
    return handleServerActionError(error, 'addFieldComment')
  }
}

/**
 * Update an existing comment (author or admin only)
 */
export async function updateFieldComment(
  requestId: string,
  commentId: string,
  newText: string
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const isAdmin = await checkIsAdmin()

    // Get existing comments
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      select: { fieldComments: true },
    })

    if (!request) {
      return { success: false, error: 'Booking request not found' }
    }

    const existingComments = parseFieldComments(request.fieldComments)
    const commentIndex = existingComments.findIndex(c => c.id === commentId)

    if (commentIndex === -1) {
      return { success: false, error: 'Comment not found' }
    }

    const comment = existingComments[commentIndex]

    // Check permission: only author or admin can edit
    if (comment.authorId !== userId && !isAdmin) {
      return { success: false, error: 'You do not have permission to edit this comment' }
    }

    // Store old text in edit history
    const editHistoryEntry = {
      text: comment.text,
      editedAt: new Date().toISOString(),
    }

    // Update comment
    const updatedComment: FieldComment = {
      ...comment,
      text: newText.trim(),
      updatedAt: new Date().toISOString(),
      editHistory: [...comment.editHistory, editHistoryEntry],
    }

    // Replace in array
    const updatedComments = [...existingComments]
    updatedComments[commentIndex] = updatedComment

    // Save to database
    await prisma.bookingRequest.update({
      where: { id: requestId },
      data: {
        fieldComments: updatedComments as unknown as Prisma.InputJsonValue,
      },
    })

    // Only invalidate booking-requests - comments are stored there, deals don't need refresh
    invalidateEntity('booking-requests')

    return { success: true, data: updatedComment }
  } catch (error) {
    return handleServerActionError(error, 'updateFieldComment')
  }
}

/**
 * Delete a comment (admin only)
 */
export async function deleteFieldComment(
  requestId: string,
  commentId: string
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can delete comments
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return { success: false, error: 'Only admins can delete comments' }
    }

    // Get existing comments
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      select: { fieldComments: true },
    })

    if (!request) {
      return { success: false, error: 'Booking request not found' }
    }

    const existingComments = parseFieldComments(request.fieldComments)
    const updatedComments = existingComments.filter(c => c.id !== commentId)

    if (updatedComments.length === existingComments.length) {
      return { success: false, error: 'Comment not found' }
    }

    // Save to database
    await prisma.bookingRequest.update({
      where: { id: requestId },
      data: {
        fieldComments: updatedComments as unknown as Prisma.InputJsonValue,
      },
    })

    // Only invalidate booking-requests - comments are stored there, deals don't need refresh
    invalidateEntity('booking-requests')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteFieldComment')
  }
}

