/**
 * Task Reminder Email Service
 * 
 * Sends daily reminder emails to users with tasks due today or overdue
 */

import { prisma } from '@/lib/prisma'
import { resend, EMAIL_CONFIG } from '../config'
import { renderTaskReminderEmail, type TaskForEmail } from '../templates/task-reminder'
import { getAppBaseUrl } from '@/lib/config/env'
import { logger } from '@/lib/logger'
import { getTodayInPanama, formatDateForPanama, parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'

interface UserTasksGroup {
  userId: string
  userName: string
  userEmail: string
  dueTodayTasks: TaskForEmail[]
  overdueTasks: TaskForEmail[]
}

/**
 * Get all tasks that are due today or overdue, grouped by responsible user
 */
async function getTasksByResponsibleUser(): Promise<UserTasksGroup[]> {
  // Get today's date range in Panama timezone
  const todayStr = getTodayInPanama()
  const todayStart = parseDateInPanamaTime(todayStr)
  const todayEnd = parseEndDateInPanamaTime(todayStr)

  // Get all incomplete tasks that are due today or overdue
  const tasks = await prisma.task.findMany({
    where: {
      completed: false,
      date: {
        lte: todayEnd, // Due today or earlier (overdue)
      },
    },
    include: {
      opportunity: {
        select: {
          id: true,
          stage: true,
          responsibleId: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  })

  // Get unique responsible user IDs
  const userIds = [...new Set(tasks.map(t => t.opportunity.responsibleId).filter(Boolean))] as string[]

  // Fetch user profiles
  const userProfiles = await prisma.userProfile.findMany({
    where: {
      clerkId: { in: userIds },
    },
    select: {
      clerkId: true,
      name: true,
      email: true,
    },
  })

  const userMap = new Map(userProfiles.map(u => [u.clerkId, u]))

  // Group tasks by responsible user
  const tasksByUser = new Map<string, UserTasksGroup>()

  for (const task of tasks) {
    const responsibleId = task.opportunity.responsibleId
    if (!responsibleId) continue

    const user = userMap.get(responsibleId)
    if (!user || !user.email) continue

    if (!tasksByUser.has(responsibleId)) {
      tasksByUser.set(responsibleId, {
        userId: responsibleId,
        userName: user.name || user.email.split('@')[0],
        userEmail: user.email,
        dueTodayTasks: [],
        overdueTasks: [],
      })
    }

    const userGroup = tasksByUser.get(responsibleId)!
    
    // Compare dates using Panama timezone
    const taskDateStr = formatDateForPanama(new Date(task.date))
    
    const taskForEmail: TaskForEmail = {
      id: task.id,
      title: task.title,
      date: task.date,
      category: task.category as 'meeting' | 'todo',
      notes: task.notes,
      opportunity: {
        id: task.opportunity.id,
        stage: task.opportunity.stage,
        business: {
          id: task.opportunity.business.id,
          name: task.opportunity.business.name,
        },
      },
    }

    if (taskDateStr < todayStr) {
      userGroup.overdueTasks.push(taskForEmail)
    } else {
      userGroup.dueTodayTasks.push(taskForEmail)
    }
  }

  return Array.from(tasksByUser.values())
}

/**
 * Build email payload for a single user
 */
function buildEmailPayload(userTasks: UserTasksGroup, appBaseUrl: string) {
  const totalTasks = userTasks.dueTodayTasks.length + userTasks.overdueTasks.length
  
  const html = renderTaskReminderEmail({
    userName: userTasks.userName,
    dueTodayTasks: userTasks.dueTodayTasks,
    overdueTasks: userTasks.overdueTasks,
    appBaseUrl,
  })

  return {
    from: EMAIL_CONFIG.from,
    to: userTasks.userEmail,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: `📋 Tienes ${totalTasks} tarea${totalTasks !== 1 ? 's' : ''} pendiente${totalTasks !== 1 ? 's' : ''} - OfertaSimple`,
    html,
  }
}

/**
 * Split array into chunks of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Send all task reminder emails using batch API
 * Uses Resend's batch endpoint to send up to 100 emails per request
 * This is more efficient and avoids rate limiting (2 req/sec limit)
 */
export async function sendAllTaskReminders(): Promise<{
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
    const userTaskGroups = await getTasksByResponsibleUser()
    const appBaseUrl = getAppBaseUrl()

    logger.info(`Found ${userTaskGroups.length} users with pending tasks`)

    // Filter out users with no tasks and build email payloads
    const emailPayloads: { email: ReturnType<typeof buildEmailPayload>; userEmail: string }[] = []
    
    for (const userTasks of userTaskGroups) {
      const totalTasks = userTasks.dueTodayTasks.length + userTasks.overdueTasks.length
      
      if (totalTasks === 0) {
        skipped++
        continue
      }

      emailPayloads.push({
        email: buildEmailPayload(userTasks, appBaseUrl),
        userEmail: userTasks.userEmail,
      })
    }

    if (emailPayloads.length === 0) {
      logger.info('No task reminder emails to send')
      return { success: true, sent: 0, failed: 0, skipped, errors: [] }
    }

    // Send in batches of 100 (Resend batch limit)
    const BATCH_SIZE = 100
    const batches = chunkArray(emailPayloads, BATCH_SIZE)

    logger.info(`Sending ${emailPayloads.length} emails in ${batches.length} batch(es)`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      
      try {
        const result = await resend.batch.send(batch.map(b => b.email))

        if (result.error) {
          // Batch-level error - all emails in this batch failed
          logger.error(`Batch ${i + 1} failed:`, result.error)
          failed += batch.length
          for (const item of batch) {
            errors.push(`${item.userEmail}: ${result.error.message}`)
          }
        } else if (result.data) {
          // Batch succeeded - all emails in this batch were sent
          sent += batch.length
          logger.info(`Batch ${i + 1} sent ${batch.length} emails`)
        }
      } catch (error) {
        // Network or unexpected error - all emails in batch failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Batch ${i + 1} exception:`, error)
        failed += batch.length
        for (const item of batch) {
          errors.push(`${item.userEmail}: ${errorMessage}`)
        }
      }

      // Delay between batches to stay under rate limit (2 req/sec)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 550))
      }
    }

    logger.info(`Task reminders complete: ${sent} sent, ${failed} failed, ${skipped} skipped`)

    return {
      success: failed === 0,
      sent,
      failed,
      skipped,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error in sendAllTaskReminders:', error)
    return {
      success: false,
      sent,
      failed,
      skipped,
      errors: [errorMessage],
    }
  }
}

