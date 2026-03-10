'use server'

import { prisma } from '@/lib/prisma'
import { getUserProfile } from '@/lib/auth/roles'
import { formatDateForPanama, getLastNDaysRangeInPanama, getTodayInPanama, parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'
import { ONE_DAY_MS } from '@/lib/constants/time'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { roundToTwo, normalizeDisplayName } from './_shared'

const TRACTION_WINDOW_DAYS = 14

export interface AdminDailyAgendaBookingActivity {
  sent: number
  approved: number
  booked: number
  rejected: number
}

export interface AdminDailyAgendaObjectionItem {
  id: string
  businessName: string
  ownerName: string | null
  reason: string | null
  type: 'rejection' | 'lost'
}

export interface AdminDailyAgendaTier1AtRiskItem {
  businessId: string
  businessName: string
  ownerName: string | null
  riskType: 'no_opportunity' | 'no_traction'
  detail: string
  daysSinceLastActivity: number | null
}

export interface AdminDailyAgendaUserRow {
  userId: string
  name: string
  team: string | null
  meetingsCompleted: number
  todosCompleted: number
  requestsSent: number
  requestsApproved: number
  requestsBooked: number
  opportunitiesCreated: number
  opportunitiesWon: number
  score: number
}

export interface AdminDailyAgendaData {
  generatedAt: Date
  yesterday: {
    date: string
    displayLabel: string
  }
  bookingActivity: AdminDailyAgendaBookingActivity
  meetingsCompleted: number
  objections: AdminDailyAgendaObjectionItem[]
  tier1AtRisk: AdminDailyAgendaTier1AtRiskItem[]
  salesPerformance: AdminDailyAgendaUserRow[]
  weeklyComparison: {
    startDate: string
    endDate: string
    avgBookingsSent: number
    avgBookingsApproved: number
    avgBookingsBooked: number
    avgMeetingsCompleted: number
  }
  user: {
    userId: string
    displayName: string
  }
}

function buildAdminUserScore(row: {
  meetingsCompleted: number
  todosCompleted: number
  requestsSent: number
  requestsApproved: number
  requestsBooked: number
  opportunitiesWon: number
}): number {
  return roundToTwo(
    row.meetingsCompleted * 3 +
    row.todosCompleted +
    row.requestsSent * 2 +
    row.requestsApproved * 3 +
    row.requestsBooked * 4 +
    row.opportunitiesWon * 5
  )
}

function formatYesterdayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Number(dateStr.split('-')[0]), month - 1, day)
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${dayNames[d.getDay()]} ${day} ${monthNames[d.getMonth()]}`
}

export async function getAdminDailyAgenda() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) return authResult

  try {
    const userProfile = await getUserProfile()
    if (!userProfile || userProfile.role !== 'admin') {
      return { success: false, error: 'Agenda disponible solo para administradores.' }
    }

    const todayDate = getTodayInPanama()
    const todayStart = parseDateInPanamaTime(todayDate)
    const yesterdayStart = new Date(todayStart.getTime() - ONE_DAY_MS)
    const yesterdayDate = formatDateForPanama(yesterdayStart)
    const yStart = parseDateInPanamaTime(yesterdayDate)
    const yEnd = parseEndDateInPanamaTime(yesterdayDate)

    const rollingRange = getLastNDaysRangeInPanama(7)
    const rollingStart = parseDateInPanamaTime(rollingRange.startDate)
    const rollingEnd = parseEndDateInPanamaTime(rollingRange.endDate)

    const tractionCutoff = new Date(todayStart.getTime() - TRACTION_WINDOW_DAYS * ONE_DAY_MS)

    const [
      requestsSent,
      requestsApproved,
      requestsBooked,
      requestsRejected,
      meetingsCompleted,
      rejectedRequests,
      lostOpportunities,
      tier1Businesses,
      salesUsers,
    ] = await Promise.all([
      prisma.bookingRequest.count({ where: { sentAt: { gte: yStart, lte: yEnd } } }),
      prisma.bookingRequest.count({
        where: {
          OR: [
            { approvedAt: { gte: yStart, lte: yEnd } },
            { status: { in: ['approved', 'booked'] }, processedAt: { gte: yStart, lte: yEnd } },
          ],
        },
      }),
      prisma.bookingRequest.count({
        where: {
          OR: [
            { bookedAt: { gte: yStart, lte: yEnd } },
            { status: 'booked', processedAt: { gte: yStart, lte: yEnd } },
          ],
        },
      }),
      prisma.bookingRequest.count({ where: { rejectedAt: { gte: yStart, lte: yEnd } } }),
      prisma.task.count({
        where: { completed: true, category: 'meeting', date: { gte: yStart, lte: yEnd } },
      }),

      prisma.bookingRequest.findMany({
        where: { rejectedAt: { gte: yStart, lte: yEnd } },
        select: {
          id: true,
          name: true,
          rejectionReason: true,
          userId: true,
          business: { select: { name: true } },
        },
        orderBy: { rejectedAt: 'desc' },
        take: 20,
      }),

      prisma.opportunity.findMany({
        where: { stage: 'lost', updatedAt: { gte: yStart, lte: yEnd } },
        select: {
          id: true,
          lostReason: true,
          responsibleId: true,
          business: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),

      prisma.business.findMany({
        where: {
          tier: 1,
          OR: [
            { reassignmentStatus: null },
            { reassignmentStatus: { not: 'archived' } },
          ],
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          opportunities: {
            where: {
              stage: { notIn: ['won', 'lost'] },
            },
            select: {
              id: true,
              lastActivityDate: true,
              tasks: {
                where: { completed: true, date: { gte: tractionCutoff } },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),

      prisma.userProfile.findMany({
        where: { role: 'sales', isActive: true },
        select: { clerkId: true, name: true, email: true, team: true },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
      }),
    ])

    const userNameMap = new Map<string, string>()
    for (const user of salesUsers) {
      userNameMap.set(user.clerkId, normalizeDisplayName(user.name, user.email, user.clerkId))
    }

    const objections: AdminDailyAgendaObjectionItem[] = [
      ...rejectedRequests.map((req) => ({
        id: `req:${req.id}`,
        businessName: req.business?.name || req.name,
        ownerName: userNameMap.get(req.userId) || null,
        reason: req.rejectionReason || null,
        type: 'rejection' as const,
      })),
      ...lostOpportunities.map((opp) => ({
        id: `opp:${opp.id}`,
        businessName: opp.business.name,
        ownerName: opp.responsibleId ? userNameMap.get(opp.responsibleId) || null : null,
        reason: opp.lostReason || null,
        type: 'lost' as const,
      })),
    ]

    const tier1AtRisk: AdminDailyAgendaTier1AtRiskItem[] = []
    for (const biz of tier1Businesses) {
      const openOpps = biz.opportunities
      if (openOpps.length === 0) {
        tier1AtRisk.push({
          businessId: biz.id,
          businessName: biz.name,
          ownerName: biz.ownerId ? userNameMap.get(biz.ownerId) || null : null,
          riskType: 'no_opportunity',
          detail: 'Sin oportunidad abierta',
          daysSinceLastActivity: null,
        })
        continue
      }

      const hasRecentTraction = openOpps.some((opp) => opp.tasks.length > 0)
      if (!hasRecentTraction) {
        const latestActivity = openOpps
          .map((opp) => opp.lastActivityDate)
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0]
        const daysSince = latestActivity
          ? Math.floor((todayStart.getTime() - latestActivity.getTime()) / ONE_DAY_MS)
          : null
        tier1AtRisk.push({
          businessId: biz.id,
          businessName: biz.name,
          ownerName: biz.ownerId ? userNameMap.get(biz.ownerId) || null : null,
          riskType: 'no_traction',
          detail: daysSince !== null
            ? `Sin actividad hace ${daysSince} días`
            : `Sin actividad en últimos ${TRACTION_WINDOW_DAYS} días`,
          daysSinceLastActivity: daysSince,
        })
      }
    }

    tier1AtRisk.sort((a, b) => {
      if (a.riskType !== b.riskType) return a.riskType === 'no_opportunity' ? -1 : 1
      return a.businessName.localeCompare(b.businessName, 'es')
    })

    const salesUserIds = salesUsers.map((u) => u.clerkId)

    const [userTasks, userBookings, userOpportunities] = await Promise.all([
      prisma.task.findMany({
        where: {
          completed: true,
          date: { gte: yStart, lte: yEnd },
          opportunity: { responsibleId: { in: salesUserIds } },
        },
        select: {
          category: true,
          opportunity: { select: { responsibleId: true } },
        },
      }),
      prisma.bookingRequest.findMany({
        where: {
          userId: { in: salesUserIds },
          OR: [
            { sentAt: { gte: yStart, lte: yEnd } },
            { approvedAt: { gte: yStart, lte: yEnd } },
            { bookedAt: { gte: yStart, lte: yEnd } },
            { processedAt: { gte: yStart, lte: yEnd }, status: { in: ['approved', 'booked'] } },
          ],
        },
        select: {
          userId: true,
          status: true,
          sentAt: true,
          approvedAt: true,
          bookedAt: true,
          processedAt: true,
        },
      }),
      prisma.opportunity.findMany({
        where: {
          responsibleId: { in: salesUserIds },
          OR: [
            { createdAt: { gte: yStart, lte: yEnd } },
            { wonAt: { gte: yStart, lte: yEnd } },
          ],
        },
        select: {
          responsibleId: true,
          createdAt: true,
          wonAt: true,
        },
      }),
    ])

    type UserAccum = {
      meetingsCompleted: number
      todosCompleted: number
      requestsSent: number
      requestsApproved: number
      requestsBooked: number
      opportunitiesCreated: number
      opportunitiesWon: number
    }

    const userStatsMap = new Map<string, UserAccum>()
    for (const uid of salesUserIds) {
      userStatsMap.set(uid, {
        meetingsCompleted: 0, todosCompleted: 0,
        requestsSent: 0, requestsApproved: 0, requestsBooked: 0,
        opportunitiesCreated: 0, opportunitiesWon: 0,
      })
    }

    for (const task of userTasks) {
      const rid = task.opportunity.responsibleId
      if (!rid) continue
      const stats = userStatsMap.get(rid)
      if (!stats) continue
      if (task.category === 'meeting') stats.meetingsCompleted += 1
      else stats.todosCompleted += 1
    }

    for (const booking of userBookings) {
      const stats = userStatsMap.get(booking.userId)
      if (!stats) continue
      if (booking.sentAt && booking.sentAt >= yStart && booking.sentAt <= yEnd) {
        stats.requestsSent += 1
      }
      const approvedInWindow = Boolean(
        (booking.approvedAt && booking.approvedAt >= yStart && booking.approvedAt <= yEnd) ||
        ((booking.status === 'approved' || booking.status === 'booked') &&
          booking.processedAt && booking.processedAt >= yStart && booking.processedAt <= yEnd)
      )
      if (approvedInWindow) stats.requestsApproved += 1
      const bookedInWindow = Boolean(
        (booking.bookedAt && booking.bookedAt >= yStart && booking.bookedAt <= yEnd) ||
        (booking.status === 'booked' &&
          booking.processedAt && booking.processedAt >= yStart && booking.processedAt <= yEnd)
      )
      if (bookedInWindow) stats.requestsBooked += 1
    }

    for (const opp of userOpportunities) {
      if (!opp.responsibleId) continue
      const stats = userStatsMap.get(opp.responsibleId)
      if (!stats) continue
      if (opp.createdAt >= yStart && opp.createdAt <= yEnd) stats.opportunitiesCreated += 1
      if (opp.wonAt && opp.wonAt >= yStart && opp.wonAt <= yEnd) stats.opportunitiesWon += 1
    }

    const salesPerformance: AdminDailyAgendaUserRow[] = salesUsers
      .map((user) => {
        const stats = userStatsMap.get(user.clerkId)!
        return {
          userId: user.clerkId,
          name: normalizeDisplayName(user.name, user.email, user.clerkId),
          team: user.team?.trim() || null,
          ...stats,
          score: buildAdminUserScore(stats),
        }
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.name.localeCompare(b.name, 'es')
      })

    const [
      weeklyRequestsSent,
      weeklyRequestsApproved,
      weeklyRequestsBooked,
      weeklyMeetings,
    ] = await Promise.all([
      prisma.bookingRequest.count({ where: { sentAt: { gte: rollingStart, lte: rollingEnd } } }),
      prisma.bookingRequest.count({
        where: {
          OR: [
            { approvedAt: { gte: rollingStart, lte: rollingEnd } },
            { status: { in: ['approved', 'booked'] }, processedAt: { gte: rollingStart, lte: rollingEnd } },
          ],
        },
      }),
      prisma.bookingRequest.count({
        where: {
          OR: [
            { bookedAt: { gte: rollingStart, lte: rollingEnd } },
            { status: 'booked', processedAt: { gte: rollingStart, lte: rollingEnd } },
          ],
        },
      }),
      prisma.task.count({
        where: { completed: true, category: 'meeting', date: { gte: rollingStart, lte: rollingEnd } },
      }),
    ])

    return {
      success: true,
      data: {
        generatedAt: new Date(),
        yesterday: {
          date: yesterdayDate,
          displayLabel: formatYesterdayLabel(yesterdayDate),
        },
        bookingActivity: {
          sent: requestsSent,
          approved: requestsApproved,
          booked: requestsBooked,
          rejected: requestsRejected,
        },
        meetingsCompleted,
        objections,
        tier1AtRisk,
        salesPerformance,
        weeklyComparison: {
          startDate: rollingRange.startDate,
          endDate: rollingRange.endDate,
          avgBookingsSent: roundToTwo(weeklyRequestsSent / 7),
          avgBookingsApproved: roundToTwo(weeklyRequestsApproved / 7),
          avgBookingsBooked: roundToTwo(weeklyRequestsBooked / 7),
          avgMeetingsCompleted: roundToTwo(weeklyMeetings / 7),
        },
        user: {
          userId: authResult.userId,
          displayName: normalizeDisplayName(userProfile.name, userProfile.email, authResult.userId),
        },
      } satisfies AdminDailyAgendaData,
    }
  } catch (error) {
    return handleServerActionError(error, 'getAdminDailyAgenda')
  }
}
