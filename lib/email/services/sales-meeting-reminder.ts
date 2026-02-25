/**
 * Sales Meeting Reminder Email Service
 *
 * Sends reminder emails to active sales users that have 0 meetings
 * registered in the last 48 hours.
 */

import { prisma } from '@/lib/prisma'
import { getAppBaseUrl } from '@/lib/config/env'
import { logger } from '@/lib/logger'
import { resend, EMAIL_CONFIG } from '../config'
import { renderSalesMeetingReminderEmail } from '../templates/sales-meeting-reminder'

interface SalesUserReminderTarget {
  userId: string
  userName: string
  userEmail: string
}

interface ReminderTargetSummary {
  targets: SalesUserReminderTarget[]
  totalSalesUsers: number
  usersWithMeetings: number
}

const NO_MEETING_WINDOW_HOURS = 48

function getDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name
  if (email && email.includes('@')) return email.split('@')[0]
  return 'Usuario'
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

async function getSalesUsersWithoutRecentMeetings(): Promise<ReminderTargetSummary> {
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - NO_MEETING_WINDOW_HOURS * 60 * 60 * 1000)

  const salesUsers = await prisma.userProfile.findMany({
    where: {
      role: 'sales',
      isActive: true,
      email: { not: null },
    },
    select: {
      clerkId: true,
      name: true,
      email: true,
    },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  })

  if (salesUsers.length === 0) {
    return {
      targets: [],
      totalSalesUsers: 0,
      usersWithMeetings: 0,
    }
  }

  const salesUserIds = salesUsers.map((user) => user.clerkId)

  const recentMeetings = await prisma.task.findMany({
    where: {
      category: 'meeting',
      date: {
        gte: windowStart,
        lte: windowEnd,
      },
      opportunity: {
        responsibleId: { in: salesUserIds },
      },
    },
    select: {
      opportunity: {
        select: {
          responsibleId: true,
        },
      },
    },
  })

  const usersWithRecentMeetings = new Set(
    recentMeetings
      .map((meeting) => meeting.opportunity.responsibleId)
      .filter((responsibleId): responsibleId is string => Boolean(responsibleId))
  )

  const targets = salesUsers
    .filter((user) => !usersWithRecentMeetings.has(user.clerkId))
    .map((user) => ({
      userId: user.clerkId,
      userName: getDisplayName(user.name, user.email),
      userEmail: user.email as string,
    }))

  return {
    targets,
    totalSalesUsers: salesUsers.length,
    usersWithMeetings: usersWithRecentMeetings.size,
  }
}

export async function sendSalesMeetingReminders(): Promise<{
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: string[]
  usersEvaluated: number
  usersWithMeetings: number
  usersWithoutMeetings: number
}> {
  const errors: string[] = []
  let sent = 0
  let failed = 0
  let skipped = 0

  try {
    const appBaseUrl = getAppBaseUrl()
    const { targets, totalSalesUsers, usersWithMeetings } = await getSalesUsersWithoutRecentMeetings()

    skipped = usersWithMeetings

    logger.info(
      `[SalesMeetingReminder] Evaluated ${totalSalesUsers} users, ${targets.length} without meetings in last ${NO_MEETING_WINDOW_HOURS} hours`
    )

    if (targets.length === 0) {
      return {
        success: true,
        sent: 0,
        failed: 0,
        skipped,
        errors: [],
        usersEvaluated: totalSalesUsers,
        usersWithMeetings,
        usersWithoutMeetings: 0,
      }
    }

    const emailPayloads = targets.map((target) => ({
      userEmail: target.userEmail,
      email: {
        from: EMAIL_CONFIG.from,
        to: target.userEmail,
        replyTo: EMAIL_CONFIG.replyTo,
        subject: 'Recordatorio CRM: no registraste reuniones en las últimas 48 horas - OfertaSimple',
        html: renderSalesMeetingReminderEmail({
          userName: target.userName,
          dateLabel: 'Últimas 48 horas',
          meetingsCount: 0,
          crmUrl: `${appBaseUrl}/opportunities`,
        }),
      },
    }))

    const BATCH_SIZE = 100
    const batches = chunkArray(emailPayloads, BATCH_SIZE)

    logger.info(`[SalesMeetingReminder] Sending ${emailPayloads.length} email(s) in ${batches.length} batch(es)`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]

      try {
        const result = await resend.batch.send(batch.map((item) => item.email))

        if (result.error) {
          failed += batch.length
          for (const item of batch) {
            errors.push(`${item.userEmail}: ${result.error.message}`)
          }
          logger.error(`[SalesMeetingReminder] Batch ${i + 1} failed:`, result.error)
        } else if (result.data) {
          sent += batch.length
          logger.info(`[SalesMeetingReminder] Batch ${i + 1} sent ${batch.length} email(s)`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        failed += batch.length
        for (const item of batch) {
          errors.push(`${item.userEmail}: ${errorMessage}`)
        }
        logger.error(`[SalesMeetingReminder] Batch ${i + 1} exception:`, error)
      }

      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 550))
      }
    }

    logger.info(`[SalesMeetingReminder] Complete: ${sent} sent, ${failed} failed, ${skipped} skipped`)

    return {
      success: failed === 0,
      sent,
      failed,
      skipped,
      errors,
      usersEvaluated: totalSalesUsers,
      usersWithMeetings,
      usersWithoutMeetings: targets.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SalesMeetingReminder] Error in sendSalesMeetingReminders:', error)
    return {
      success: false,
      sent,
      failed,
      skipped,
      errors: [errorMessage],
      usersEvaluated: 0,
      usersWithMeetings: 0,
      usersWithoutMeetings: 0,
    }
  }
}
