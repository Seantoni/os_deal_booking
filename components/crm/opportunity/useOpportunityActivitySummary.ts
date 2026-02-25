'use client'

import { useMemo } from 'react'
import { formatDateForPanama, getTodayInPanama } from '@/lib/date/timezone'
import type { Task } from '@/types'

export interface ActivitySummaryEntry {
  date: Date | string
  days: number
  daysText: string
}

export interface OpportunityActivitySummary {
  nextTask: ActivitySummaryEntry | null
  lastTask: ActivitySummaryEntry | null
  nextMeeting: ActivitySummaryEntry | null
  lastMeeting: ActivitySummaryEntry | null
}

export function useOpportunityActivitySummary(tasks: Task[]): OpportunityActivitySummary {
  return useMemo(() => {
    if (!tasks.length) return { nextTask: null, lastTask: null, nextMeeting: null, lastMeeting: null }

    const getTaskDateStr = (date: Date | string) => formatDateForPanama(new Date(date))
    const todayStr = getTodayInPanama()

    const getDaysDiff = (date: Date | string) => {
      const taskDateStr = formatDateForPanama(new Date(date))
      const taskParts = taskDateStr.split('-').map(Number)
      const todayParts = todayStr.split('-').map(Number)

      const taskDate = new Date(taskParts[0], taskParts[1] - 1, taskParts[2])
      const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2])
      const diffTime = taskDate.getTime() - todayDate.getTime()
      return Math.round(diffTime / (1000 * 60 * 60 * 24))
    }

    const formatDays = (days: number) => {
      if (days === 0) return 'hoy'
      if (days === 1) return 'mañana'
      if (days === -1) return 'ayer'
      if (days > 0) return `en ${days}d`
      return `hace ${Math.abs(days)}d`
    }

    const sortByDateAsc = (a: Task, b: Task) => new Date(a.date).getTime() - new Date(b.date).getTime()
    const sortByDateDesc = (a: Task, b: Task) => new Date(b.date).getTime() - new Date(a.date).getTime()

    const regularTasks = tasks.filter((t) => t.category !== 'meeting')
    const meetingTasks = tasks.filter((t) => t.category === 'meeting')

    const nextTask = regularTasks.filter((t) => !t.completed).sort(sortByDateAsc)[0]
    const lastTask = regularTasks.filter((t) => {
      const dateStr = getTaskDateStr(t.date)
      return t.completed || dateStr < todayStr
    }).sort(sortByDateDesc)[0]

    const nextMeeting = meetingTasks.filter((t) => !t.completed).sort(sortByDateAsc)[0]
    const lastMeeting = meetingTasks.filter((t) => {
      const dateStr = getTaskDateStr(t.date)
      return t.completed || dateStr < todayStr
    }).sort(sortByDateDesc)[0]

    const toEntry = (task?: Task | null): ActivitySummaryEntry | null => {
      if (!task) return null
      const days = getDaysDiff(task.date)
      return { date: task.date, days, daysText: formatDays(days) }
    }

    return {
      nextTask: toEntry(nextTask),
      lastTask: toEntry(lastTask),
      nextMeeting: toEntry(nextMeeting),
      lastMeeting: toEntry(lastMeeting),
    }
  }, [tasks])
}
