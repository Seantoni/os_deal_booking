'use server'

import { prisma } from '@/lib/prisma'
import { getUserProfile } from '@/lib/auth/roles'
import { aiComplete } from '@/lib/ai/client'
import { formatDateForPanama, getLastNDaysRangeInPanama, getTodayInPanama, parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'
import { ONE_DAY_MS } from '@/lib/constants/time'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import {
  roundToTwo,
  normalizeDisplayName,
  getCachedAiResult,
  setCachedAiResult,
  type ObjectionCategory,
} from './_shared'

const TRACTION_WINDOW_DAYS = 14
const AI_OBJECTION_THRESHOLD = 3

export interface AdminDailyAgendaBookingActivity {
  sent: number
  approved: number
  booked: number
  rejected: number
}

export interface AdminDailyAgendaObjectionRecap {
  totalMeetingsWithObjection: number
  categories: ObjectionCategory[]
  aiGenerated: boolean
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
  objectionRecap: AdminDailyAgendaObjectionRecap
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

interface ObjectionCategorizationResult {
  categories: ObjectionCategory[]
  usedAi: boolean
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

function normalizeKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildFallbackCategories(rawObjections: string[]): ObjectionCategory[] {
  const counter = new Map<string, { label: string; count: number }>()
  for (const raw of rawObjections) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = normalizeKey(trimmed)
    if (!key) continue
    const existing = counter.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counter.set(key, { label: trimmed, count: 1 })
    }
  }
  return [...counter.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 8)
    .map((item) => ({ category: item.label, count: item.count, examples: [item.label] }))
}

async function categorizeObjectionsWithAi(
  rawObjections: string[],
  dateKey: string,
): Promise<ObjectionCategorizationResult> {
  const cacheKey = `admin-objection-categories:${dateKey}`

  const cached = getCachedAiResult<ObjectionCategorizationResult | ObjectionCategory[]>(cacheKey)
  if (cached) {
    if (Array.isArray(cached)) {
      return { categories: cached, usedAi: false }
    }
    return cached
  }

  try {
    const raw = await aiComplete({
      preset: 'lightweight',
      messages: [
        {
          role: 'system',
          content: 'Eres analista comercial. Consolida objeciones de reuniones de ventas en categorías claras. Responde SOLO JSON válido.',
        },
        {
          role: 'user',
          content: `Agrupa las siguientes objeciones de reuniones comerciales en categorías consolidadas.\n\nDevuelve SOLO un JSON array con esta estructura:\n[\n  { "category": string, "count": number, "examples": string[] }\n]\n\nReglas:\n- Categorías en español, concisas (ej: "Precio alto", "Competencia", "Timing / No es prioridad").\n- count = cuántas objeciones caen en esa categoría.\n- examples = hasta 2 ejemplos textuales originales de esa categoría.\n- Máximo 6 categorías.\n\nObjeciones:\n${rawObjections.map((o, i) => `${i + 1}. ${o}`).join('\n')}`,
        },
      ],
    })
    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start < 0 || end <= start) throw new Error('No JSON array in response')

    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown[]
    const categories: ObjectionCategory[] = parsed
      .slice(0, 8)
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null
        const r = item as Record<string, unknown>
        const category = typeof r.category === 'string' ? r.category.trim() : null
        const count = typeof r.count === 'number' && Number.isFinite(r.count) ? Math.max(1, Math.round(r.count)) : 1
        const examples = Array.isArray(r.examples)
          ? r.examples.filter((e): e is string => typeof e === 'string' && e.trim().length > 0).slice(0, 2)
          : []
        if (!category) return null
        return { category, count, examples }
      })
      .filter((item): item is ObjectionCategory => item !== null)

    if (categories.length === 0) throw new Error('Empty categories from AI')

    const result = { categories, usedAi: true }
    setCachedAiResult(cacheKey, result)
    return result
  } catch {
    const fallback = buildFallbackCategories(rawObjections)
    const result = { categories: fallback, usedAi: false }
    setCachedAiResult(cacheKey, result)
    return result
  }
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
      completedMeetings,
      tier1Businesses,
      salesUsers,
      weeklyRequestsSent,
      weeklyRequestsApproved,
      weeklyRequestsBooked,
      weeklyMeetings,
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

      prisma.task.findMany({
        where: {
          completed: true,
          category: 'meeting',
          date: { gte: yStart, lte: yEnd },
        },
        select: {
          id: true,
          title: true,
          notes: true,
          opportunity: {
            select: {
              responsibleId: true,
              business: { select: { name: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
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

      // Weekly rolling counts (previously a separate sequential batch)
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

    const userNameMap = new Map<string, string>()
    for (const user of salesUsers) {
      userNameMap.set(user.clerkId, normalizeDisplayName(user.name, user.email, user.clerkId))
    }

    // Extract raw objection strings from completed meetings where reachedAgreement === 'no'
    const rawObjections: string[] = []
    for (const task of completedMeetings) {
      if (!task.notes) continue
      try {
        const data = JSON.parse(task.notes)
        if (data.reachedAgreement !== 'no' || !data.mainObjection) continue
        const text = typeof data.mainObjection === 'string' ? data.mainObjection.trim() : ''
        if (text) rawObjections.push(text)
      } catch {
        // Skip tasks with non-JSON notes
      }
    }

    // Categorize objections: AI for 3+, deterministic fallback for fewer
    let objectionCategories: ObjectionCategory[]
    let aiGenerated = false
    if (rawObjections.length >= AI_OBJECTION_THRESHOLD) {
      const categorization = await categorizeObjectionsWithAi(rawObjections, yesterdayDate)
      objectionCategories = categorization.categories
      aiGenerated = categorization.usedAi
    } else {
      objectionCategories = buildFallbackCategories(rawObjections)
    }

    const objectionRecap: AdminDailyAgendaObjectionRecap = {
      totalMeetingsWithObjection: rawObjections.length,
      categories: objectionCategories,
      aiGenerated,
    }

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
        objectionRecap,
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
