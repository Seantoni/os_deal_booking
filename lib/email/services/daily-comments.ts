/**
 * Daily Comments Summary Email Service
 *
 * Sends daily emails with comments received across categories.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resend, EMAIL_CONFIG } from '../config'
import { renderDailyCommentsEmail, type DailyCommentItem } from '../templates/daily-comments'
import { getAppBaseUrl } from '@/lib/config/env'
import { logger } from '@/lib/logger'
import { parseFieldComments } from '@/types/field-comment'

interface UserCommentsGroup {
  userId: string
  userName: string
  userEmail: string
  opportunities: DailyCommentItem[]
  marketing: DailyCommentItem[]
  requests: DailyCommentItem[]
}

interface TempEntry {
  recipientId: string
  authorId: string
  category: 'opportunities' | 'marketing' | 'requests'
  item: Omit<DailyCommentItem, 'authorName'>
}

function getDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name
  if (email && email.includes('@')) return email.split('@')[0]
  return 'Alguien'
}

function buildTimeWindow(): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  return { start, end }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export async function sendDailyCommentsSummary(): Promise<{
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: string[]
}> {
  const errors: string[] = []
  let sent = 0
  let failed = 0
  let skipped = 0

  try {
    const { start, end } = buildTimeWindow()
    const appBaseUrl = getAppBaseUrl()

    const [oppComments, mktComments, bookingRequests] = await Promise.all([
      prisma.opportunityComment.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          userId: true,
          content: true,
          mentions: true,
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
      }),
      prisma.marketingOptionComment.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          userId: true,
          content: true,
          mentions: true,
          createdAt: true,
          optionId: true,
          option: {
            select: {
              campaign: {
                select: {
                  id: true,
                  bookingRequest: { select: { merchant: true, name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.bookingRequest.findMany({
        where: { fieldComments: { not: Prisma.JsonNull } },
        select: {
          id: true,
          name: true,
          merchant: true,
          fieldComments: true,
        },
      }),
    ])

    const tempEntries: TempEntry[] = []
    const recipientIds = new Set<string>()
    const authorIds = new Set<string>()

    for (const comment of oppComments) {
      const recipients = new Set<string>()
      const mentions = (comment.mentions as string[]) || []
      mentions.forEach(id => id && recipients.add(id))
      if (comment.opportunity.responsibleId) recipients.add(comment.opportunity.responsibleId)
      if (comment.opportunity.userId) recipients.add(comment.opportunity.userId)
      recipients.delete(comment.userId)

      const entityName = comment.opportunity.business?.name || 'Oportunidad'
      const linkUrl = `${appBaseUrl}/opportunities?open=${comment.opportunityId}`

      for (const recipientId of recipients) {
        tempEntries.push({
          recipientId,
          authorId: comment.userId,
          category: 'opportunities',
          item: {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            entityName,
            linkUrl,
          },
        })
        recipientIds.add(recipientId)
      }
      authorIds.add(comment.userId)
    }

    for (const comment of mktComments) {
      const mentions = (comment.mentions as string[]) || []
      const recipients = mentions.filter(id => id && id !== comment.userId)
      if (recipients.length === 0) continue

      const entityName = comment.option.campaign.bookingRequest.merchant
        || comment.option.campaign.bookingRequest.name
        || 'Campana'
      const linkUrl = `${appBaseUrl}/marketing?open=${comment.option.campaign.id}&option=${comment.optionId}`

      for (const recipientId of recipients) {
        tempEntries.push({
          recipientId,
          authorId: comment.userId,
          category: 'marketing',
          item: {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            entityName,
            linkUrl,
          },
        })
        recipientIds.add(recipientId)
      }
      authorIds.add(comment.userId)
    }

    for (const request of bookingRequests) {
      const comments = parseFieldComments(request.fieldComments)
      for (const comment of comments) {
        const createdAt = new Date(comment.createdAt)
        if (createdAt < start || createdAt > end) continue
        const mentions = comment.mentions || []
        const recipients = mentions.filter(id => id && id !== comment.authorId)
        if (recipients.length === 0) continue

        const entityName = request.merchant || request.name || 'Solicitud'
        const linkUrl = `${appBaseUrl}/deals?request=${request.id}&comment=${comment.id}`

        for (const recipientId of recipients) {
          tempEntries.push({
            recipientId,
            authorId: comment.authorId,
            category: 'requests',
            item: {
              id: comment.id,
              content: comment.text,
              createdAt,
              entityName,
              linkUrl,
            },
          })
          recipientIds.add(recipientId)
        }
        authorIds.add(comment.authorId)
      }
    }

    if (tempEntries.length === 0) {
      logger.info('No daily comment summaries to send')
      return { success: true, sent: 0, failed: 0, skipped: 0, errors: [] }
    }

    const allUserIds = Array.from(new Set([...recipientIds, ...authorIds]))
    const userProfiles = await prisma.userProfile.findMany({
      where: { clerkId: { in: allUserIds } },
      select: { clerkId: true, name: true, email: true },
    })

    const userMap = new Map(userProfiles.map(u => [u.clerkId, u]))

    const userGroups = new Map<string, UserCommentsGroup>()

    for (const entry of tempEntries) {
      const recipient = userMap.get(entry.recipientId)
      if (!recipient || !recipient.email) {
        skipped++
        continue
      }

      const author = userMap.get(entry.authorId)
      const authorName = getDisplayName(author?.name, author?.email)

      if (!userGroups.has(entry.recipientId)) {
        userGroups.set(entry.recipientId, {
          userId: entry.recipientId,
          userName: getDisplayName(recipient.name, recipient.email),
          userEmail: recipient.email,
          opportunities: [],
          marketing: [],
          requests: [],
        })
      }

      const group = userGroups.get(entry.recipientId)!
      const fullItem: DailyCommentItem = { ...entry.item, authorName }

      if (entry.category === 'opportunities') group.opportunities.push(fullItem)
      if (entry.category === 'marketing') group.marketing.push(fullItem)
      if (entry.category === 'requests') group.requests.push(fullItem)
    }

    const emailPayloads: { email: { from: string; to: string; replyTo: string; subject: string; html: string }; userEmail: string }[] = []

    for (const group of userGroups.values()) {
      const totalCount = group.opportunities.length + group.marketing.length + group.requests.length
      if (totalCount === 0) {
        skipped++
        continue
      }

      const html = renderDailyCommentsEmail({
        userName: group.userName,
        opportunities: group.opportunities,
        marketing: group.marketing,
        requests: group.requests,
        appBaseUrl,
      })

      emailPayloads.push({
        userEmail: group.userEmail,
        email: {
          from: EMAIL_CONFIG.from,
          to: group.userEmail,
          replyTo: EMAIL_CONFIG.replyTo,
          subject: `Resumen diario de comentarios (${totalCount}) - OfertaSimple`,
          html,
        },
      })
    }

    if (emailPayloads.length === 0) {
      logger.info('No daily comment emails to send after filtering')
      return { success: true, sent: 0, failed: 0, skipped, errors: [] }
    }

    const BATCH_SIZE = 100
    const batches = chunkArray(emailPayloads, BATCH_SIZE)

    logger.info(`Sending ${emailPayloads.length} daily comment emails in ${batches.length} batch(es)`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      try {
        const result = await resend.batch.send(batch.map(b => b.email))
        if (result.error) {
          failed += batch.length
          for (const item of batch) {
            errors.push(`${item.userEmail}: ${result.error.message}`)
          }
          logger.error(`Batch ${i + 1} failed:`, result.error)
        } else if (result.data) {
          sent += batch.length
          logger.info(`Batch ${i + 1} sent ${batch.length} emails`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Batch ${i + 1} exception:`, error)
        failed += batch.length
        for (const item of batch) {
          errors.push(`${item.userEmail}: ${errorMessage}`)
        }
      }

      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 550))
      }
    }

    logger.info(`Daily comment summaries complete: ${sent} sent, ${failed} failed, ${skipped} skipped`)

    return {
      success: failed === 0,
      sent,
      failed,
      skipped,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error in sendDailyCommentsSummary:', error)
    return {
      success: false,
      sent,
      failed,
      skipped,
      errors: [errorMessage],
    }
  }
}
