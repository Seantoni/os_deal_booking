'use server'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleServerActionError } from '@/lib/utils/server-actions'

export type CronJobStatus = 'running' | 'success' | 'failed'

export type CronJobName = 
  | 'deal-metrics-sync'
  | 'task-reminders'
  | 'market-intelligence-scan'
  | 'event-leads-sync'
  | 'restaurant-leads-sync'

export interface CronJobLog {
  id: string
  jobName: string
  status: string
  startedAt: Date
  completedAt: Date | null
  durationMs: number | null
  message: string | null
  details: Record<string, unknown> | null
  error: string | null
  triggeredBy: string
  createdAt: Date
}

/**
 * Start a new cron job log entry
 */
export async function startCronJobLog(
  jobName: CronJobName,
  triggeredBy: 'cron' | 'manual' = 'cron'
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const log = await prisma.cronJobLog.create({
      data: {
        jobName,
        status: 'running',
        triggeredBy,
        startedAt: new Date(),
      },
    })

    logger.info(`[CronJobLog] Started: ${jobName}`, { logId: log.id, triggeredBy })

    return { success: true, logId: log.id }
  } catch (error) {
    logger.error('[CronJobLog] Failed to start log:', error)
    return handleServerActionError(error, 'Failed to start cron job log')
  }
}

/**
 * Complete a cron job log entry (success or failure)
 */
export async function completeCronJobLog(
  logId: string,
  status: 'success' | 'failed',
  options: {
    message?: string
    details?: Record<string, unknown>
    error?: string
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const log = await prisma.cronJobLog.findUnique({
      where: { id: logId },
      select: { startedAt: true, jobName: true },
    })

    if (!log) {
      return { success: false, error: 'Log not found' }
    }

    const completedAt = new Date()
    const durationMs = completedAt.getTime() - log.startedAt.getTime()

    await prisma.cronJobLog.update({
      where: { id: logId },
      data: {
        status,
        completedAt,
        durationMs,
        message: options.message,
        details: options.details ? JSON.parse(JSON.stringify(options.details)) : undefined,
        error: options.error,
      },
    })

    logger.info(`[CronJobLog] Completed: ${log.jobName}`, {
      logId,
      status,
      durationMs,
      message: options.message,
    })

    return { success: true }
  } catch (error) {
    logger.error('[CronJobLog] Failed to complete log:', error)
    return handleServerActionError(error, 'Failed to complete cron job log')
  }
}

/**
 * Get paginated cron job logs
 */
export async function getCronJobLogs(options: {
  page?: number
  pageSize?: number
  jobName?: CronJobName
  status?: CronJobStatus
}): Promise<{
  success: boolean
  data?: CronJobLog[]
  totalCount?: number
  error?: string
}> {
  try {
    const { page = 0, pageSize = 20, jobName, status } = options

    const where: { jobName?: string; status?: string } = {}
    if (jobName) where.jobName = jobName
    if (status) where.status = status

    const [logs, totalCount] = await Promise.all([
      prisma.cronJobLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.cronJobLog.count({ where }),
    ])

    return {
      success: true,
      data: logs as CronJobLog[],
      totalCount,
    }
  } catch (error) {
    logger.error('[CronJobLog] Failed to get logs:', error)
    return handleServerActionError(error, 'Failed to get cron job logs')
  }
}

/**
 * Delete cron job logs older than specified days
 */
export async function cleanupOldCronJobLogs(
  retentionDays: number = 30
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.cronJobLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    logger.info(`[CronJobLog] Cleanup: Deleted ${result.count} logs older than ${retentionDays} days`)

    return { success: true, deletedCount: result.count }
  } catch (error) {
    logger.error('[CronJobLog] Failed to cleanup logs:', error)
    return handleServerActionError(error, 'Failed to cleanup cron job logs')
  }
}

/**
 * Get summary stats for cron jobs
 */
export async function getCronJobStats(): Promise<{
  success: boolean
  data?: {
    jobName: string
    lastRun: Date | null
    lastStatus: string | null
    successCount24h: number
    failedCount24h: number
  }[]
  error?: string
}> {
  try {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Get unique job names
    const jobNames: CronJobName[] = [
      'deal-metrics-sync',
      'task-reminders',
      'market-intelligence-scan',
    ]

    const stats = await Promise.all(
      jobNames.map(async (jobName) => {
        const [lastLog, successCount, failedCount] = await Promise.all([
          prisma.cronJobLog.findFirst({
            where: { jobName },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true, status: true },
          }),
          prisma.cronJobLog.count({
            where: {
              jobName,
              status: 'success',
              startedAt: { gte: oneDayAgo },
            },
          }),
          prisma.cronJobLog.count({
            where: {
              jobName,
              status: 'failed',
              startedAt: { gte: oneDayAgo },
            },
          }),
        ])

        return {
          jobName,
          lastRun: lastLog?.startedAt ?? null,
          lastStatus: lastLog?.status ?? null,
          successCount24h: successCount,
          failedCount24h: failedCount,
        }
      })
    )

    return { success: true, data: stats }
  } catch (error) {
    logger.error('[CronJobLog] Failed to get stats:', error)
    return handleServerActionError(error, 'Failed to get cron job stats')
  }
}
