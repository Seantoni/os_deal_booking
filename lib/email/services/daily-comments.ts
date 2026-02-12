/**
 * Daily Comments Summary Email Service
 *
 * Sends daily emails with all current inbox comments per user.
 */

import { prisma } from '@/lib/prisma'
import { resend, EMAIL_CONFIG } from '../config'
import { renderDailyCommentsEmail, type DailyCommentItem } from '../templates/daily-comments'
import { getAppBaseUrl } from '@/lib/config/env'
import { logger } from '@/lib/logger'
import { getInboxItemsForUser, type InboxItem } from '@/lib/inbox/get-inbox-items'

interface UserCommentsGroup {
  userName: string
  userEmail: string
  opportunities: DailyCommentItem[]
  marketing: DailyCommentItem[]
  requests: DailyCommentItem[]
}

function getDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name
  if (email && email.includes('@')) return email.split('@')[0]
  return 'Alguien'
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

function toAbsoluteUrl(appBaseUrl: string, linkUrl: string): string {
  if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) return linkUrl
  return `${appBaseUrl}${linkUrl}`
}

function mapInboxItemToDailyComment(item: InboxItem, appBaseUrl: string): DailyCommentItem {
  return {
    id: item.commentId,
    authorName: getDisplayName(item.author.name, item.author.email),
    content: item.content,
    createdAt: item.createdAt,
    entityName: item.entityName,
    linkUrl: toAbsoluteUrl(appBaseUrl, item.linkUrl),
  }
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
    const appBaseUrl = getAppBaseUrl()

    const users = await prisma.userProfile.findMany({
      where: {
        isActive: true,
        email: { not: null },
      },
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
    })

    if (users.length === 0) {
      logger.info('No active users with email for daily comment summaries')
      return { success: true, sent: 0, failed: 0, skipped: 0, errors: [] }
    }

    const userGroups: UserCommentsGroup[] = []

    for (const user of users) {
      if (!user.email) {
        skipped++
        continue
      }

      const inboxItems = await getInboxItemsForUser(user.clerkId)
      if (inboxItems.length === 0) {
        skipped++
        continue
      }

      const group: UserCommentsGroup = {
        userName: getDisplayName(user.name, user.email),
        userEmail: user.email,
        opportunities: [],
        marketing: [],
        requests: [],
      }

      for (const item of inboxItems) {
        const mapped = mapInboxItemToDailyComment(item, appBaseUrl)

        if (item.entityType === 'opportunity') {
          group.opportunities.push(mapped)
        } else if (item.entityType === 'marketing') {
          group.marketing.push(mapped)
        } else {
          group.requests.push(mapped)
        }
      }

      userGroups.push(group)
    }

    const emailPayloads: { email: { from: string; to: string; replyTo: string; subject: string; html: string }; userEmail: string }[] = []

    for (const group of userGroups) {
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
