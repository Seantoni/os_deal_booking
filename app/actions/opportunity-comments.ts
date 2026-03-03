'use server'

import { CommentThreadStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'
import { logger } from '@/lib/logger'
import { addDismissedByValues, THREAD_RESOLVED_MARKER } from '@/lib/comments/thread-resolution'
import { generateThreadResolutionOneLiner } from '@/lib/ai/thread-resolution'

const INITIAL_THREAD_TITLE = 'Item 1'
const LEGACY_THREAD_TITLE = 'Historial previo'

function buildNextItemTitle(existingTitles: string[]): string {
  let maxItemNumber = 0

  for (const title of existingTitles) {
    const match = title.trim().match(/^item\s+(\d+)$/i)
    if (!match) continue

    const parsedNumber = Number.parseInt(match[1], 10)
    if (Number.isFinite(parsedNumber) && parsedNumber > maxItemNumber) {
      maxItemNumber = parsedNumber
    }
  }

  return `Item ${maxItemNumber + 1}`
}

// Types
export interface CommentAuthor {
  clerkId: string
  name: string | null
  email: string | null
}

export interface OpportunityCommentThreadSummary {
  id: string
  opportunityId: string
  title: string
  status: CommentThreadStatus
  createdBy: string
  createdAt: Date
  updatedAt: Date
  resolutionNote: string | null
  resolvedBy: string | null
  resolvedAt: Date | null
  commentCount: number
  lastCommentAt: Date | null
  createdByAuthor: CommentAuthor | null
  resolvedByAuthor: CommentAuthor | null
}

export interface OpportunityCommentWithAuthor {
  id: string
  opportunityId: string
  threadId: string | null
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
 * Keeps thread data consistent while migrating legacy comments.
 * - Moves comments without threadId into a thread
 * - Ensures there is an initial open thread when no threads exist
 */
async function ensureOpportunityThreadConsistency(opportunityId: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const openThread = await tx.opportunityCommentThread.findFirst({
      where: {
        opportunityId,
        status: CommentThreadStatus.OPEN,
      },
      select: { id: true },
    })

    const orphanCommentCount = await tx.opportunityComment.count({
      where: {
        opportunityId,
        threadId: null,
      },
    })

    let targetThreadId = openThread?.id || null

    if (orphanCommentCount > 0 && !targetThreadId) {
      const legacyThread = await tx.opportunityCommentThread.create({
        data: {
          opportunityId,
          title: LEGACY_THREAD_TITLE,
          createdBy: userId,
          status: CommentThreadStatus.OPEN,
        },
        select: { id: true },
      })
      targetThreadId = legacyThread.id
    }

    if (orphanCommentCount > 0 && targetThreadId) {
      await tx.opportunityComment.updateMany({
        where: {
          opportunityId,
          threadId: null,
        },
        data: {
          threadId: targetThreadId,
        },
      })
    }

    const totalThreadCount = await tx.opportunityCommentThread.count({
      where: { opportunityId },
    })

    if (totalThreadCount === 0) {
      await tx.opportunityCommentThread.create({
        data: {
          opportunityId,
          title: INITIAL_THREAD_TITLE,
          createdBy: userId,
          status: CommentThreadStatus.OPEN,
        },
      })
    }
  })
}

/**
 * Get all comment threads for an opportunity.
 */
export async function getOpportunityCommentThreads(opportunityId: string): Promise<{
  success: boolean
  data?: OpportunityCommentThreadSummary[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const canAccess = await canAccessOpportunityComments(opportunityId, userId)
    if (!canAccess) {
      return { success: false, error: 'No tienes acceso a los comentarios de esta oportunidad' }
    }

    await ensureOpportunityThreadConsistency(opportunityId, userId)

    const threads = await prisma.opportunityCommentThread.findMany({
      where: { opportunityId },
      include: {
        comments: {
          where: { isDeleted: false },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            comments: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    const authorIds = new Set<string>()
    threads.forEach((thread) => {
      authorIds.add(thread.createdBy)
      if (thread.resolvedBy) {
        authorIds.add(thread.resolvedBy)
      }
    })

    const profiles = await prisma.userProfile.findMany({
      where: {
        clerkId: { in: Array.from(authorIds) },
      },
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
    })

    const userMap = new Map<string, CommentAuthor>(
      profiles.map((profile) => [
        profile.clerkId,
        {
          clerkId: profile.clerkId,
          name: profile.name,
          email: profile.email,
        },
      ])
    )

    const mappedThreads: OpportunityCommentThreadSummary[] = threads.map((thread) => ({
      id: thread.id,
      opportunityId: thread.opportunityId,
      title: thread.title,
      status: thread.status,
      createdBy: thread.createdBy,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      resolutionNote: thread.resolutionNote,
      resolvedBy: thread.resolvedBy,
      resolvedAt: thread.resolvedAt,
      commentCount: thread._count.comments,
      lastCommentAt: thread.comments[0]?.createdAt || null,
      createdByAuthor: userMap.get(thread.createdBy) || null,
      resolvedByAuthor: thread.resolvedBy ? userMap.get(thread.resolvedBy) || null : null,
    }))

    return {
      success: true,
      data: mappedThreads,
    }
  } catch (error) {
    return handleServerActionError(error, 'getOpportunityCommentThreads')
  }
}

/**
 * Create a new open thread for an opportunity.
 * Only allowed when there is no open thread.
 */
export async function createOpportunityCommentThread(
  opportunityId: string,
  title: string
): Promise<{
  success: boolean
  data?: OpportunityCommentThreadSummary
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const canAccess = await canAccessOpportunityComments(opportunityId, userId)
    if (!canAccess) {
      return { success: false, error: 'No tienes permiso para crear items en esta oportunidad' }
    }

    await ensureOpportunityThreadConsistency(opportunityId, userId)

    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      return { success: false, error: 'El título del item es requerido' }
    }

    const createResult = await prisma.$transaction(async (tx) => {
      const existingOpenThread = await tx.opportunityCommentThread.findFirst({
        where: {
          opportunityId,
          status: CommentThreadStatus.OPEN,
        },
        select: { id: true },
      })

      if (existingOpenThread) {
        return { error: 'Ya existe un item abierto. Debe resolverlo antes de crear uno nuevo.' }
      }

      const createdThread = await tx.opportunityCommentThread.create({
        data: {
          opportunityId,
          title: normalizedTitle,
          createdBy: userId,
          status: CommentThreadStatus.OPEN,
        },
      })

      return { thread: createdThread }
    })

    if ('error' in createResult) {
      return { success: false, error: createResult.error }
    }

    const authorProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
    })

    return {
      success: true,
      data: {
        id: createResult.thread.id,
        opportunityId: createResult.thread.opportunityId,
        title: createResult.thread.title,
        status: createResult.thread.status,
        createdBy: createResult.thread.createdBy,
        createdAt: createResult.thread.createdAt,
        updatedAt: createResult.thread.updatedAt,
        resolutionNote: createResult.thread.resolutionNote,
        resolvedBy: createResult.thread.resolvedBy,
        resolvedAt: createResult.thread.resolvedAt,
        commentCount: 0,
        lastCommentAt: null,
        createdByAuthor: authorProfile
          ? {
              clerkId: authorProfile.clerkId,
              name: authorProfile.name,
              email: authorProfile.email,
            }
          : null,
        resolvedByAuthor: null,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'createOpportunityCommentThread')
  }
}

/**
 * Resolve an open thread.
 * Resolution note is generated automatically with AI.
 * Also dismisses all comments in the thread for every user.
 */
export async function resolveOpportunityCommentThread(
  threadId: string
): Promise<{
  success: boolean
  data?: OpportunityCommentThreadSummary
  nextOpenThreadId?: string
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const thread = await prisma.opportunityCommentThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        opportunityId: true,
        status: true,
        title: true,
        createdBy: true,
        createdAt: true,
      },
    })

    if (!thread) {
      return { success: false, error: 'Item no encontrado' }
    }

    const canAccess = await canAccessOpportunityComments(thread.opportunityId, userId)
    if (!canAccess) {
      return { success: false, error: 'No tienes permiso para resolver este item' }
    }

    if (thread.status !== CommentThreadStatus.OPEN) {
      return { success: false, error: 'Este item ya está resuelto' }
    }

    const rawThreadComments = await prisma.opportunityComment.findMany({
      where: {
        threadId: thread.id,
        isDeleted: false,
      },
      select: {
        content: true,
        userId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const authorIds = Array.from(new Set(rawThreadComments.map((comment) => comment.userId)))
    const authors = authorIds.length
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: authorIds } },
          select: {
            clerkId: true,
            name: true,
            email: true,
          },
        })
      : []
    const authorMap = new Map(authors.map((author) => [author.clerkId, author]))

    const resolutionResult = await generateThreadResolutionOneLiner({
      threadTitle: thread.title,
      comments: rawThreadComments.map((comment) => {
        const author = authorMap.get(comment.userId)
        return {
          authorName: author?.name || author?.email || 'Usuario',
          content: comment.content,
        }
      }),
    })
    const generatedResolutionNote = resolutionResult.text

    if (resolutionResult.usedFallback) {
      logger.warn('AI resolution note fell back to deterministic summary', {
        threadId: thread.id,
        opportunityId: thread.opportunityId,
      })
    }

    const now = new Date()

    const resolvedThread = await prisma.$transaction(async (tx) => {
      const updatedThread = await tx.opportunityCommentThread.update({
        where: { id: thread.id },
        data: {
          status: CommentThreadStatus.RESOLVED,
          resolutionNote: generatedResolutionNote,
          resolvedBy: userId,
          resolvedAt: now,
        },
      })

      const threadComments = await tx.opportunityComment.findMany({
        where: {
          threadId: thread.id,
          isDeleted: false,
        },
        select: {
          id: true,
          dismissedBy: true,
        },
      })

      for (const comment of threadComments) {
        const nextDismissedBy = addDismissedByValues(comment.dismissedBy, [THREAD_RESOLVED_MARKER])

        await tx.opportunityComment.update({
          where: { id: comment.id },
          data: {
            dismissedBy: nextDismissedBy,
          },
        })
      }

      const existingThreadTitles = await tx.opportunityCommentThread.findMany({
        where: {
          opportunityId: thread.opportunityId,
        },
        select: {
          title: true,
        },
      })

      const nextThreadTitle = buildNextItemTitle(existingThreadTitles.map((entry) => entry.title))

      const nextOpenThread = await tx.opportunityCommentThread.create({
        data: {
          opportunityId: thread.opportunityId,
          title: nextThreadTitle,
          createdBy: userId,
          status: CommentThreadStatus.OPEN,
        },
        select: {
          id: true,
        },
      })

      return {
        thread: updatedThread,
        commentCount: threadComments.length,
        nextOpenThreadId: nextOpenThread.id,
        lastCommentAt: null as Date | null,
      }
    })

    const [createdByProfile, resolvedByProfile, lastComment] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { clerkId: thread.createdBy },
        select: {
          clerkId: true,
          name: true,
          email: true,
        },
      }),
      prisma.userProfile.findUnique({
        where: { clerkId: userId },
        select: {
          clerkId: true,
          name: true,
          email: true,
        },
      }),
      prisma.opportunityComment.findFirst({
        where: {
          threadId: thread.id,
          isDeleted: false,
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ])

    return {
      success: true,
      nextOpenThreadId: resolvedThread.nextOpenThreadId,
      data: {
        id: resolvedThread.thread.id,
        opportunityId: resolvedThread.thread.opportunityId,
        title: resolvedThread.thread.title,
        status: resolvedThread.thread.status,
        createdBy: resolvedThread.thread.createdBy,
        createdAt: resolvedThread.thread.createdAt,
        updatedAt: resolvedThread.thread.updatedAt,
        resolutionNote: resolvedThread.thread.resolutionNote,
        resolvedBy: resolvedThread.thread.resolvedBy,
        resolvedAt: resolvedThread.thread.resolvedAt,
        commentCount: resolvedThread.commentCount,
        lastCommentAt: lastComment?.createdAt || null,
        createdByAuthor: createdByProfile
          ? {
              clerkId: createdByProfile.clerkId,
              name: createdByProfile.name,
              email: createdByProfile.email,
            }
          : null,
        resolvedByAuthor: resolvedByProfile
          ? {
              clerkId: resolvedByProfile.clerkId,
              name: resolvedByProfile.name,
              email: resolvedByProfile.email,
            }
          : null,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'resolveOpportunityCommentThread')
  }
}

/**
 * Get all comments for a thread in an opportunity.
 * If threadId is not provided, returns the open thread comments, or latest thread comments.
 */
export async function getOpportunityComments(
  opportunityId: string,
  threadId?: string
): Promise<{
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

    await ensureOpportunityThreadConsistency(opportunityId, userId)

    let selectedThreadId = threadId || null

    if (selectedThreadId) {
      const selectedThread = await prisma.opportunityCommentThread.findFirst({
        where: {
          id: selectedThreadId,
          opportunityId,
        },
        select: { id: true },
      })

      if (!selectedThread) {
        return { success: false, error: 'Item no encontrado en esta oportunidad' }
      }
    } else {
      const openThread = await prisma.opportunityCommentThread.findFirst({
        where: {
          opportunityId,
          status: CommentThreadStatus.OPEN,
        },
        select: { id: true },
      })

      if (openThread) {
        selectedThreadId = openThread.id
      } else {
        const latestThread = await prisma.opportunityCommentThread.findFirst({
          where: { opportunityId },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        })
        selectedThreadId = latestThread?.id || null
      }
    }

    if (!selectedThreadId) {
      return { success: true, data: [] }
    }

    const comments = await prisma.opportunityComment.findMany({
      where: {
        opportunityId,
        threadId: selectedThreadId,
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

    const userMap = new Map(userProfiles.map((u) => [u.clerkId, u]))

    // Map comments with author info
    const commentsWithAuthors: OpportunityCommentWithAuthor[] = comments.map((comment: {
      id: string
      opportunityId: string
      threadId: string | null
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
      threadId: comment.threadId,
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
 * Create a new comment on an opportunity thread
 */
export async function createOpportunityComment(
  opportunityId: string,
  data: {
    threadId: string
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

    const normalizedContent = data.content.trim()
    if (!normalizedContent) {
      return { success: false, error: 'El comentario no puede estar vacío' }
    }

    await ensureOpportunityThreadConsistency(opportunityId, userId)

    // Verify thread exists and is open
    const thread = await prisma.opportunityCommentThread.findFirst({
      where: {
        id: data.threadId,
        opportunityId,
      },
      include: {
        opportunity: {
          include: {
            business: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!thread) {
      return { success: false, error: 'Item no encontrado en esta oportunidad' }
    }

    if (thread.status !== CommentThreadStatus.OPEN) {
      return { success: false, error: 'Este item está resuelto. Abra uno nuevo para continuar.' }
    }

    // Create the comment
    const comment = await prisma.opportunityComment.create({
      data: {
        opportunityId,
        threadId: data.threadId,
        userId,
        content: normalizedContent,
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

    const author: CommentAuthor | null = authorProfile
      ? {
          clerkId: authorProfile.clerkId,
          name: authorProfile.name,
          email: authorProfile.email,
        }
      : null

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
          content: normalizedContent,
          opportunityId,
          businessName: thread.opportunity.business.name,
        }).catch((err) => {
          logger.error('Error sending opportunity mention notifications:', err)
        })
      } else {
        logger.info('Mention notification emails are disabled - skipping email send')
      }
    }

    const commentWithAuthor: OpportunityCommentWithAuthor = {
      id: comment.id,
      opportunityId: comment.opportunityId,
      threadId: comment.threadId,
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
    const normalizedContent = data.content.trim()
    if (!normalizedContent) {
      return { success: false, error: 'El comentario no puede estar vacío' }
    }

    // Verify ownership
    const existingComment = await prisma.opportunityComment.findUnique({
      where: { id: commentId },
      include: {
        thread: {
          select: {
            status: true,
          },
        },
      },
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

    if (existingComment.thread?.status === CommentThreadStatus.RESOLVED) {
      return { success: false, error: 'Este item está resuelto y es de solo lectura' }
    }

    // Update the comment
    const existingMentions = existingComment.mentions as string[] | null
    const comment = await prisma.opportunityComment.update({
      where: { id: commentId },
      data: {
        content: normalizedContent,
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

    const author: CommentAuthor | null = authorProfile
      ? {
          clerkId: authorProfile.clerkId,
          name: authorProfile.name,
          email: authorProfile.email,
        }
      : null

    const commentWithAuthor: OpportunityCommentWithAuthor = {
      id: comment.id,
      opportunityId: comment.opportunityId,
      threadId: comment.threadId,
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
      include: {
        thread: {
          select: {
            status: true,
          },
        },
      },
    })

    if (!existingComment) {
      return { success: false, error: 'Comentario no encontrado' }
    }

    if (existingComment.userId !== userId) {
      return { success: false, error: 'Solo puedes eliminar tus propios comentarios' }
    }

    if (existingComment.thread?.status === CommentThreadStatus.RESOLVED) {
      return { success: false, error: 'Este item está resuelto y es de solo lectura' }
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
 * Also auto-dismisses the comment from inbox when adding a reaction
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
      include: {
        thread: {
          select: {
            status: true,
          },
        },
      },
    })

    if (!comment) {
      return { success: false, error: 'Comentario no encontrado' }
    }

    if (comment.isDeleted) {
      return { success: false, error: 'No se puede reaccionar a un comentario eliminado' }
    }

    if (comment.thread?.status === CommentThreadStatus.RESOLVED) {
      return { success: false, error: 'Este item está resuelto y es de solo lectura' }
    }

    // Get current reactions and dismissedBy
    const currentReactions = (comment.reactions as Record<string, string[]>) || {}
    const dismissedBy = addDismissedByValues(comment.dismissedBy, [])

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
    await prisma.opportunityComment.update({
      where: { id: commentId },
      data: updateData,
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
