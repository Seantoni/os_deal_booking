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
 * Send task reminder email to a single user
 */
async function sendTaskReminderToUser(userTasks: UserTasksGroup): Promise<{ success: boolean; error?: string }> {
  const appBaseUrl = getAppBaseUrl()
  
  const html = renderTaskReminderEmail({
    userName: userTasks.userName,
    dueTodayTasks: userTasks.dueTodayTasks,
    overdueTasks: userTasks.overdueTasks,
    appBaseUrl,
  })

  const totalTasks = userTasks.dueTodayTasks.length + userTasks.overdueTasks.length

  try {
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: userTasks.userEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `📋 Tienes ${totalTasks} tarea${totalTasks !== 1 ? 's' : ''} pendiente${totalTasks !== 1 ? 's' : ''} - OfertaSimple`,
      html,
    })

    if (result.error) {
      logger.error(`Failed to send task reminder to ${userTasks.userEmail}:`, result.error)
      return { success: false, error: result.error.message }
    }

    logger.info(`Task reminder sent to ${userTasks.userEmail} (${totalTasks} tasks)`)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Error sending task reminder to ${userTasks.userEmail}:`, error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Send all task reminder emails
 * Returns summary of sent emails
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

    logger.info(`Found ${userTaskGroups.length} users with pending tasks`)

    for (const userTasks of userTaskGroups) {
      const totalTasks = userTasks.dueTodayTasks.length + userTasks.overdueTasks.length
      
      // Skip if no tasks (shouldn't happen, but just in case)
      if (totalTasks === 0) {
        skipped++
        continue
      }

      const result = await sendTaskReminderToUser(userTasks)
      
      if (result.success) {
        sent++
      } else {
        failed++
        if (result.error) {
          errors.push(`${userTasks.userEmail}: ${result.error}`)
        }
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
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

