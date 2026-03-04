'use server'

import { prisma } from '@/lib/prisma'
import { getUserProfile } from '@/lib/auth/roles'
import { getBusinessProjectionSummaryMap } from '@/app/actions/revenue-projections'
import { getBusinessTableCounts } from '@/app/actions/businesses'
import { SALES_VISIBLE_REASSIGNMENT_CONDITION } from '@/app/actions/businesses/_shared/constants'
import { getLastNDaysRangeInPanama, getTodayInPanama, parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'

const PROJECTION_WEIGHT = 0.7
const TIER_WEIGHT = 0.3

const TIER_SCORE_BY_LEVEL: Record<number, number> = {
  1: 1,
  2: 0.5,
  3: 0.3,
}

type AgendaTaskCategory = 'meeting' | 'todo'
type ProjectionSource = 'actual_deal' | 'business_history' | 'category_benchmark' | 'none'
type DailyAgendaRiskLabel = 'Sin proyección disponible' | 'Sin actividad reciente' | 'Solo tareas, sin reuniones' | null

export interface DailyAgendaTaskItem {
  id: string
  title: string
  category: AgendaTaskCategory
  date: Date
  opportunityId: string
  opportunityName: string | null
  businessId: string | null
  businessName: string | null
  businessTier: number | null
}

export interface DailyAgendaPriorityBusiness {
  key: string
  businessId: string | null
  businessName: string
  tier: number | null
  projectionRevenue: number
  projectionSource: ProjectionSource
  priorityScore: number
  projectionScore: number
  projectionWeightedScore: number
  tierScore: number
  tierWeightedScore: number
  baseScore: number
  urgencyFactor: number
  urgencyMultiplier: number
  meetingsCount: number
  todosCount: number
  totalTasksCount: number
  hasOverdueTodo: boolean
  hasRecentActivity: boolean
  reason: string
  riskLabel: DailyAgendaRiskLabel
  suggestedAction: string
}

export interface DailyAgendaTier1WithoutOpportunityItem {
  businessId: string
  businessName: string
  tier: number
  openOpportunityCount: number
  reason: string
  suggestedAction: string
}

export interface DailyAgendaWeeklyRecap {
  startDate: string
  endDate: string
  meetingsCompleted: number
  todosCompleted: number
  approvedRequests: number
  bookedRequests: number
  wonOpportunities: number
}

export interface DailyAgendaTeamMemberPerformance {
  userId: string
  name: string
  meetingsCompleted: number
  todosCompleted: number
  approvedRequests: number
  bookedRequests: number
  wonOpportunities: number
  score: number
  isCurrentUser: boolean
}

export interface DailyAgendaPerformanceComparison {
  teamName: string
  teamSize: number
  rank: number
  userScore: number
  teamAverageScore: number
  deltaVsAveragePct: number
  topPerformers: DailyAgendaTeamMemberPerformance[]
}

export interface SalesDailyAgendaData {
  generatedAt: Date
  today: {
    date: string
    meetingsCount: number
    pendingTasksCount: number
    meetings: DailyAgendaTaskItem[]
    tasks: DailyAgendaTaskItem[]
  }
  priorities: {
    high: DailyAgendaPriorityBusiness[]
    others: DailyAgendaPriorityBusiness[]
    tier1WithoutOpenOpportunity: DailyAgendaTier1WithoutOpportunityItem[]
  }
  weeklyRecap: DailyAgendaWeeklyRecap
  performance: DailyAgendaPerformanceComparison
  user: {
    userId: string
    displayName: string
    team: string | null
  }
}

type TeamAccumulator = {
  meetingsCompleted: number
  todosCompleted: number
  approvedRequests: number
  bookedRequests: number
  wonOpportunities: number
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function normalizeTaskCategory(category: string): AgendaTaskCategory {
  return category === 'meeting' ? 'meeting' : 'todo'
}

function buildPriorityKey(businessId: string | null | undefined, opportunityId: string): string {
  return businessId || `opportunity:${opportunityId}`
}

function getProjectionScore(revenue: number, maxRevenue: number): number {
  if (!Number.isFinite(revenue) || revenue <= 0 || maxRevenue <= 0) {
    return 0
  }

  const normalized = Math.log1p(revenue) / Math.log1p(maxRevenue)
  return clamp(normalized, 0, 1)
}

function getUrgencyFactor(params: {
  meetingsCount: number
  hasOverdueTodo: boolean
  totalTasksCount: number
}): number {
  let factor = 0
  if (params.meetingsCount > 0) factor += 0.15
  if (params.hasOverdueTodo) factor += 0.1
  if (params.totalTasksCount > 2) factor += 0.05
  return roundToTwo(factor)
}

function getProjectionLabel(score: number): string {
  if (score >= 0.75) return 'proyección alta'
  if (score >= 0.45) return 'proyección media'
  if (score > 0) return 'proyección baja'
  return 'sin proyección estimada'
}

function getTierLabel(tier: number | null): string {
  if (tier === 1) return 'Tier 1'
  if (tier === 2) return 'Tier 2'
  if (tier === 3) return 'Tier 3'
  return 'tier no definido'
}

function buildPriorityReason(params: {
  tier: number | null
  projectionScore: number
  meetingsCount: number
  hasOverdueTodo: boolean
  totalTasksCount: number
}): string {
  const parts: string[] = [getTierLabel(params.tier), getProjectionLabel(params.projectionScore)]

  if (params.meetingsCount > 0) {
    parts.push('reunión hoy')
  }
  if (params.hasOverdueTodo) {
    parts.push('tareas vencidas')
  } else if (params.totalTasksCount > 2) {
    parts.push('carga pendiente alta')
  }

  return parts.join(' + ')
}

function getRiskLabel(params: {
  projectionRevenue: number
  hasRecentActivity: boolean
  meetingsCount: number
  todosCount: number
}): DailyAgendaRiskLabel {
  if (params.projectionRevenue <= 0) {
    return 'Sin proyección disponible'
  }
  if (!params.hasRecentActivity) {
    return 'Sin actividad reciente'
  }
  if (params.meetingsCount === 0 && params.todosCount > 0) {
    return 'Solo tareas, sin reuniones'
  }
  return null
}

function getSuggestedAction(params: {
  meetingsCount: number
  hasOverdueTodo: boolean
  projectionScore: number
}): string {
  if (params.meetingsCount > 0) {
    return 'Preparar propuesta y objetivos antes de la reunión.'
  }
  if (params.hasOverdueTodo) {
    return 'Resolver tareas vencidas antes de las 12:00.'
  }
  if (params.projectionScore >= 0.7) {
    return 'Agendar reunión hoy para no perder momentum.'
  }
  return 'Dar seguimiento a pendientes clave y actualizar estado.'
}

function getTierScore(tier: number | null | undefined): number {
  if (!tier || !Number.isFinite(tier)) {
    return 0
  }
  return TIER_SCORE_BY_LEVEL[Math.trunc(tier)] || 0
}

function buildTeamScore(stats: TeamAccumulator): number {
  return (
    stats.meetingsCompleted * 3 +
    stats.todosCompleted +
    stats.approvedRequests * 3 +
    stats.bookedRequests * 4 +
    stats.wonOpportunities * 5
  )
}

function normalizeDisplayName(name: string | null, email: string | null, userId: string): string {
  if (name && name.trim()) return name.trim()
  if (email && email.trim()) return email.trim()
  return `Usuario ${userId.slice(0, 8)}`
}

export async function getSalesDailyAgenda() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const userProfile = await getUserProfile()
    if (!userProfile || userProfile.role !== 'sales') {
      return { success: false, error: 'Agenda disponible solo para usuarios de ventas.' }
    }

    const todayDate = getTodayInPanama()
    const todayStart = parseDateInPanamaTime(todayDate)
    const todayEnd = parseEndDateInPanamaTime(todayDate)
    const rollingRange = getLastNDaysRangeInPanama(7)
    const rollingStart = parseDateInPanamaTime(rollingRange.startDate)
    const rollingEnd = parseEndDateInPanamaTime(rollingRange.endDate)

    const [pendingTodayTasks, overdueTodos, recentCompletedTasks, weeklyRecapRaw, tableCountsResult, tier1Businesses] = await Promise.all([
      prisma.task.findMany({
        where: {
          completed: false,
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
          opportunity: {
            responsibleId: authResult.userId,
          },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          category: true,
          date: true,
          opportunityId: true,
          opportunity: {
            select: {
              id: true,
              name: true,
              tier: true,
              business: {
                select: {
                  id: true,
                  name: true,
                  tier: true,
                },
              },
            },
          },
        },
      }),
      prisma.task.findMany({
        where: {
          completed: false,
          category: 'todo',
          date: {
            lt: todayStart,
          },
          opportunity: {
            responsibleId: authResult.userId,
          },
        },
        select: {
          opportunityId: true,
          opportunity: {
            select: {
              businessId: true,
            },
          },
        },
      }),
      prisma.task.findMany({
        where: {
          completed: true,
          date: {
            gte: rollingStart,
            lte: rollingEnd,
          },
          opportunity: {
            responsibleId: authResult.userId,
          },
        },
        select: {
          opportunityId: true,
          opportunity: {
            select: {
              businessId: true,
            },
          },
        },
      }),
      Promise.all([
        prisma.task.count({
          where: {
            completed: true,
            category: 'meeting',
            date: {
              gte: rollingStart,
              lte: rollingEnd,
            },
            opportunity: {
              responsibleId: authResult.userId,
            },
          },
        }),
        prisma.task.count({
          where: {
            completed: true,
            category: 'todo',
            date: {
              gte: rollingStart,
              lte: rollingEnd,
            },
            opportunity: {
              responsibleId: authResult.userId,
            },
          },
        }),
        prisma.bookingRequest.count({
          where: {
            userId: authResult.userId,
            OR: [
              { approvedAt: { gte: rollingStart, lte: rollingEnd } },
              { status: 'approved', processedAt: { gte: rollingStart, lte: rollingEnd } },
              { status: 'booked', processedAt: { gte: rollingStart, lte: rollingEnd } },
            ],
          },
        }),
        prisma.bookingRequest.count({
          where: {
            userId: authResult.userId,
            OR: [
              { bookedAt: { gte: rollingStart, lte: rollingEnd } },
              { status: 'booked', processedAt: { gte: rollingStart, lte: rollingEnd } },
            ],
          },
        }),
        prisma.opportunity.count({
          where: {
            responsibleId: authResult.userId,
            stage: 'won',
            wonAt: {
              gte: rollingStart,
              lte: rollingEnd,
            },
          },
        }),
      ]),
      getBusinessTableCounts(),
      prisma.business.findMany({
        where: {
          ownerId: authResult.userId,
          tier: 1,
          ...SALES_VISIBLE_REASSIGNMENT_CONDITION,
        },
        select: {
          id: true,
          name: true,
          tier: true,
        },
        orderBy: { name: 'asc' },
      }),
    ])

    const todayTasks: DailyAgendaTaskItem[] = pendingTodayTasks.map((task) => ({
      id: task.id,
      title: task.title,
      category: normalizeTaskCategory(task.category),
      date: task.date,
      opportunityId: task.opportunityId,
      opportunityName: task.opportunity.name,
      businessId: task.opportunity.business?.id || null,
      businessName: task.opportunity.business?.name || null,
      businessTier: task.opportunity.business?.tier ?? task.opportunity.tier ?? null,
    }))

    const meetings = todayTasks.filter((task) => task.category === 'meeting')
    const tasks = todayTasks.filter((task) => task.category === 'todo')

    const overdueTodoKeys = new Set(
      overdueTodos.map((task) => buildPriorityKey(task.opportunity.businessId, task.opportunityId))
    )

    const recentActivityCountByKey = new Map<string, number>()
    for (const task of recentCompletedTasks) {
      const key = buildPriorityKey(task.opportunity.businessId, task.opportunityId)
      recentActivityCountByKey.set(key, (recentActivityCountByKey.get(key) || 0) + 1)
    }

    const groupedBusinesses = new Map<
      string,
      {
        key: string
        businessId: string | null
        businessName: string
        tier: number | null
        meetingsCount: number
        todosCount: number
      }
    >()

    for (const task of todayTasks) {
      const key = buildPriorityKey(task.businessId, task.opportunityId)
      const existing = groupedBusinesses.get(key)
      if (existing) {
        if (task.category === 'meeting') {
          existing.meetingsCount += 1
        } else {
          existing.todosCount += 1
        }
      } else {
        groupedBusinesses.set(key, {
          key,
          businessId: task.businessId,
          businessName: task.businessName || task.opportunityName || 'Negocio sin nombre',
          tier: task.businessTier,
          meetingsCount: task.category === 'meeting' ? 1 : 0,
          todosCount: task.category === 'todo' ? 1 : 0,
        })
      }
    }

    const businessIds = [...groupedBusinesses.values()]
      .map((entry) => entry.businessId)
      .filter((value): value is string => !!value)

    let projectionByBusinessId: Record<string, { inProcessProjectedRevenue: number; projectionSource: ProjectionSource }> = {}
    if (businessIds.length > 0) {
      const projectionResult = await getBusinessProjectionSummaryMap(businessIds)
      if (projectionResult.success && projectionResult.data) {
        projectionByBusinessId = Object.fromEntries(
          Object.entries(projectionResult.data).map(([businessId, summary]) => [
            businessId,
            {
              inProcessProjectedRevenue: summary.inProcessProjectedRevenue || summary.totalProjectedRevenue || 0,
              projectionSource: summary.projectionSource,
            },
          ])
        )
      }
    }

    const maxProjectionRevenue = Math.max(
      0,
      ...Object.values(projectionByBusinessId).map((value) => value.inProcessProjectedRevenue || 0)
    )

    const prioritizedBusinesses: DailyAgendaPriorityBusiness[] = [...groupedBusinesses.values()]
      .map((entry) => {
        const projectionData = entry.businessId ? projectionByBusinessId[entry.businessId] : undefined
        const projectionRevenue = projectionData?.inProcessProjectedRevenue || 0
        const projectionScore = getProjectionScore(projectionRevenue, maxProjectionRevenue)
        const tierScore = getTierScore(entry.tier)
        const projectionWeightedScore = roundToTwo(projectionScore * PROJECTION_WEIGHT)
        const tierWeightedScore = roundToTwo(tierScore * TIER_WEIGHT)
        const baseScore = roundToTwo(projectionWeightedScore + tierWeightedScore)
        const hasOverdueTodo = overdueTodoKeys.has(entry.key)
        const hasRecentActivity = (recentActivityCountByKey.get(entry.key) || 0) > 0
        const urgencyFactor = getUrgencyFactor({
          meetingsCount: entry.meetingsCount,
          hasOverdueTodo,
          totalTasksCount: entry.meetingsCount + entry.todosCount,
        })
        const urgencyMultiplier = roundToTwo(1 + urgencyFactor)
        const priorityScore = roundToTwo(baseScore * urgencyMultiplier)
        const reason = buildPriorityReason({
          tier: entry.tier,
          projectionScore,
          meetingsCount: entry.meetingsCount,
          hasOverdueTodo,
          totalTasksCount: entry.meetingsCount + entry.todosCount,
        })
        const riskLabel = getRiskLabel({
          projectionRevenue,
          hasRecentActivity,
          meetingsCount: entry.meetingsCount,
          todosCount: entry.todosCount,
        })
        const suggestedAction = getSuggestedAction({
          meetingsCount: entry.meetingsCount,
          hasOverdueTodo,
          projectionScore,
        })

        return {
          key: entry.key,
          businessId: entry.businessId,
          businessName: entry.businessName,
          tier: entry.tier,
          projectionRevenue: roundToTwo(projectionRevenue),
          projectionSource: projectionData?.projectionSource || 'none',
          projectionScore: roundToTwo(projectionScore),
          projectionWeightedScore,
          tierScore: roundToTwo(tierScore),
          tierWeightedScore,
          baseScore,
          urgencyFactor,
          urgencyMultiplier,
          priorityScore,
          meetingsCount: entry.meetingsCount,
          todosCount: entry.todosCount,
          totalTasksCount: entry.meetingsCount + entry.todosCount,
          hasOverdueTodo,
          hasRecentActivity,
          reason,
          riskLabel,
          suggestedAction,
        }
      })
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore
        if (b.projectionRevenue !== a.projectionRevenue) return b.projectionRevenue - a.projectionRevenue
        const aTierRank = a.tier || 99
        const bTierRank = b.tier || 99
        if (aTierRank !== bTierRank) return aTierRank - bTierRank
        if (b.meetingsCount !== a.meetingsCount) return b.meetingsCount - a.meetingsCount
        return a.businessName.localeCompare(b.businessName, 'es')
      })

    const highPriorityBusinesses = prioritizedBusinesses.filter((item) => item.priorityScore >= 0.7)
    const highPriorityKeys = new Set(
      (highPriorityBusinesses.length > 0 ? highPriorityBusinesses : prioritizedBusinesses.slice(0, Math.min(3, prioritizedBusinesses.length)))
        .map((item) => item.key)
    )
    const finalHighPriority = prioritizedBusinesses.filter((item) => highPriorityKeys.has(item.key))
    const otherPriority = prioritizedBusinesses.filter((item) => !highPriorityKeys.has(item.key))

    const [meetingsCompleted, todosCompleted, approvedRequests, bookedRequests, wonOpportunities] = weeklyRecapRaw

    const openOpportunityCounts = tableCountsResult.success && tableCountsResult.data
      ? tableCountsResult.data.openOpportunityCounts
      : {}

    const tier1WithoutOpenOpportunity: DailyAgendaTier1WithoutOpportunityItem[] = tier1Businesses
      .filter((business) => (openOpportunityCounts[business.id] || 0) <= 0)
      .map((business) => ({
        businessId: business.id,
        businessName: business.name,
        tier: business.tier || 1,
        openOpportunityCount: openOpportunityCounts[business.id] || 0,
        reason: 'Tier 1 sin oportunidad abierta',
        suggestedAction: 'Abrir oportunidad ahora',
      }))

    const normalizedTeam = userProfile.team?.trim() || null
    const teamUsers = await prisma.userProfile.findMany({
      where: {
        role: 'sales',
        isActive: true,
        ...(normalizedTeam ? { team: normalizedTeam } : { team: null }),
      },
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    })

    const ensuredTeamUsers = teamUsers.some((member) => member.clerkId === authResult.userId)
      ? teamUsers
      : [
          ...teamUsers,
          {
            clerkId: authResult.userId,
            name: userProfile.name,
            email: userProfile.email,
          },
        ]

    const teamUserIds = ensuredTeamUsers.map((member) => member.clerkId)

    const [teamTasks, teamBookings, teamWonOpportunities] = await Promise.all([
      prisma.task.findMany({
        where: {
          completed: true,
          date: {
            gte: rollingStart,
            lte: rollingEnd,
          },
          opportunity: {
            responsibleId: { in: teamUserIds },
          },
        },
        select: {
          category: true,
          opportunity: {
            select: {
              responsibleId: true,
            },
          },
        },
      }),
      prisma.bookingRequest.findMany({
        where: {
          userId: { in: teamUserIds },
          OR: [
            { approvedAt: { gte: rollingStart, lte: rollingEnd } },
            { bookedAt: { gte: rollingStart, lte: rollingEnd } },
            { processedAt: { gte: rollingStart, lte: rollingEnd }, status: { in: ['approved', 'booked'] } },
          ],
        },
        select: {
          userId: true,
          status: true,
          approvedAt: true,
          bookedAt: true,
          processedAt: true,
        },
      }),
      prisma.opportunity.findMany({
        where: {
          responsibleId: { in: teamUserIds },
          stage: 'won',
          wonAt: {
            gte: rollingStart,
            lte: rollingEnd,
          },
        },
        select: {
          responsibleId: true,
        },
      }),
    ])

    const teamStatsMap = new Map<string, TeamAccumulator>()
    for (const memberId of teamUserIds) {
      teamStatsMap.set(memberId, {
        meetingsCompleted: 0,
        todosCompleted: 0,
        approvedRequests: 0,
        bookedRequests: 0,
        wonOpportunities: 0,
      })
    }

    for (const task of teamTasks) {
      const responsibleId = task.opportunity.responsibleId
      if (!responsibleId) continue
      const stats = teamStatsMap.get(responsibleId)
      if (!stats) continue
      if (task.category === 'meeting') {
        stats.meetingsCompleted += 1
      } else {
        stats.todosCompleted += 1
      }
    }

    for (const booking of teamBookings) {
      const stats = teamStatsMap.get(booking.userId)
      if (!stats) continue

      const approvedInWindow = Boolean(
        booking.approvedAt ||
        ((booking.status === 'approved' || booking.status === 'booked') && booking.processedAt)
      )

      const bookedInWindow = Boolean(
        booking.bookedAt ||
        (booking.status === 'booked' && booking.processedAt)
      )

      if (approvedInWindow) {
        stats.approvedRequests += 1
      }
      if (bookedInWindow) {
        stats.bookedRequests += 1
      }
    }

    for (const opportunity of teamWonOpportunities) {
      if (!opportunity.responsibleId) continue
      const stats = teamStatsMap.get(opportunity.responsibleId)
      if (!stats) continue
      stats.wonOpportunities += 1
    }

    const teamPerformance: DailyAgendaTeamMemberPerformance[] = ensuredTeamUsers
      .map((member) => {
        const stats = teamStatsMap.get(member.clerkId) || {
          meetingsCompleted: 0,
          todosCompleted: 0,
          approvedRequests: 0,
          bookedRequests: 0,
          wonOpportunities: 0,
        }

        return {
          userId: member.clerkId,
          name: normalizeDisplayName(member.name, member.email, member.clerkId),
          meetingsCompleted: stats.meetingsCompleted,
          todosCompleted: stats.todosCompleted,
          approvedRequests: stats.approvedRequests,
          bookedRequests: stats.bookedRequests,
          wonOpportunities: stats.wonOpportunities,
          score: roundToTwo(buildTeamScore(stats)),
          isCurrentUser: member.clerkId === authResult.userId,
        }
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (b.bookedRequests !== a.bookedRequests) return b.bookedRequests - a.bookedRequests
        if (b.approvedRequests !== a.approvedRequests) return b.approvedRequests - a.approvedRequests
        return a.name.localeCompare(b.name, 'es')
      })

    const currentUserRank = Math.max(
      1,
      teamPerformance.findIndex((member) => member.isCurrentUser) + 1
    )
    const currentUserPerformance = teamPerformance.find((member) => member.isCurrentUser) || null
    const totalTeamScore = teamPerformance.reduce((sum, member) => sum + member.score, 0)
    const teamAverageScore = teamPerformance.length > 0 ? totalTeamScore / teamPerformance.length : 0
    const userScore = currentUserPerformance?.score || 0
    const deltaVsAveragePct = teamAverageScore > 0
      ? roundToTwo(((userScore - teamAverageScore) / teamAverageScore) * 100)
      : 0

    return {
      success: true,
      data: {
        generatedAt: new Date(),
        today: {
          date: todayDate,
          meetingsCount: meetings.length,
          pendingTasksCount: tasks.length,
          meetings,
          tasks,
        },
        priorities: {
          high: finalHighPriority,
          others: otherPriority,
          tier1WithoutOpenOpportunity,
        },
        weeklyRecap: {
          startDate: rollingRange.startDate,
          endDate: rollingRange.endDate,
          meetingsCompleted,
          todosCompleted,
          approvedRequests,
          bookedRequests,
          wonOpportunities,
        },
        performance: {
          teamName: normalizedTeam || 'Sin equipo',
          teamSize: teamPerformance.length,
          rank: currentUserRank,
          userScore: roundToTwo(userScore),
          teamAverageScore: roundToTwo(teamAverageScore),
          deltaVsAveragePct,
          topPerformers: teamPerformance.slice(0, 3),
        },
        user: {
          userId: authResult.userId,
          displayName: normalizeDisplayName(userProfile.name, userProfile.email, authResult.userId),
          team: normalizedTeam,
        },
      } satisfies SalesDailyAgendaData,
    }
  } catch (error) {
    return handleServerActionError(error, 'getSalesDailyAgenda')
  }
}
