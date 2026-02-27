import { prisma } from '@/lib/prisma'
import { resend, EMAIL_CONFIG } from '../config'
import {
  renderWeeklyTaskReportEmail,
  type WeeklyTaskReportInsights,
  type WeeklyTaskLifecycleSegment,
  type WeeklyTaskReportObjection,
  type WeeklyTaskReportPerformer,
} from '../templates/weekly-task-report'
import { getAppBaseUrl } from '@/lib/config/env'
import { getOpenAIClient } from '@/lib/openai'
import { formatDateForPanama, formatDateTimeForPanama } from '@/lib/date/timezone'
import { logger } from '@/lib/logger'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MIN_ACTIVITY_FOR_RANKING = 3
const MAX_OBJECTION_ITEMS = 8
const MAX_AI_ITEMS = 6

type LifecycleBucket = 'new' | 'recurrent' | 'unknown'

interface MeetingNotesData {
  reachedAgreement?: unknown
  mainObjection?: unknown
}

interface PerformerAccumulator {
  userId: string
  name: string
  email: string | null
  meetingsCompleted: number
  todosCompleted: number
  agreementsYes: number
  agreementsNo: number
  proposalsSent: number
  wins: number
  losses: number
}

interface LifecycleAccumulator {
  key: LifecycleBucket
  label: string
  meetingsCompleted: number
  todosCompleted: number
  agreementsYes: number
  agreementsNo: number
}

interface PeriodSnapshot {
  startAt: Date
  endAt: Date
  createdTotal: number
  createdMeetings: number
  createdTodos: number
  completedTotal: number
  completedMeetings: number
  completedTodos: number
  agreementsYes: number
  agreementsNo: number
  agreementsUnknown: number
  objections: WeeklyTaskReportObjection[]
  performerStats: WeeklyTaskReportPerformer[]
  lifecycleSegments: WeeklyTaskLifecycleSegment[]
}

interface AiInputPayload {
  periodLabel: string
  metrics: {
    completedMeetings: number
    completedTodos: number
    agreementsYes: number
    agreementsNo: number
    agreementRatePct: number
  }
  trend: {
    meetingsDelta: number
    todosDelta: number
    agreementRateDeltaPct: number
  }
  lifecycleSegments: WeeklyTaskLifecycleSegment[]
  objections: WeeklyTaskReportObjection[]
  strongPerformers: WeeklyTaskReportPerformer[]
  weakPerformers: WeeklyTaskReportPerformer[]
}

export interface WeeklyTaskReportSummary {
  periodStart: string
  periodEnd: string
  meetingsCompleted: number
  todosCompleted: number
  agreementsYes: number
  agreementsNo: number
  topObjections: WeeklyTaskReportObjection[]
  strongPerformers: string[]
  weakPerformers: string[]
}

export interface SendWeeklyTaskReportResult {
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: string[]
  summary?: WeeklyTaskReportSummary
}

function extractJsonObject(rawText: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawText)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    const start = rawText.indexOf('{')
    const end = rawText.lastIndexOf('}')
    if (start < 0 || end <= start) return null

    try {
      const parsed = JSON.parse(rawText.slice(start, end + 1))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
      return null
    } catch {
      return null
    }
  }
}

function parseMeetingNotes(notes: string | null): { reachedAgreement: 'si' | 'no' | null; mainObjection: string | null } {
  if (!notes) {
    return { reachedAgreement: null, mainObjection: null }
  }

  try {
    const parsed = JSON.parse(notes) as MeetingNotesData
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { reachedAgreement: null, mainObjection: null }
    }

    const reachedAgreement = parsed.reachedAgreement === 'si' || parsed.reachedAgreement === 'no'
      ? parsed.reachedAgreement
      : null

    const mainObjection = typeof parsed.mainObjection === 'string' && parsed.mainObjection.trim()
      ? parsed.mainObjection.trim()
      : null

    return { reachedAgreement, mainObjection }
  } catch {
    return { reachedAgreement: null, mainObjection: null }
  }
}

function normalizeCounterKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countTopTexts(values: string[], limit: number): WeeklyTaskReportObjection[] {
  const counter = new Map<string, { label: string; count: number }>()

  for (const rawValue of values) {
    const trimmed = rawValue.trim()
    if (!trimmed) continue

    const key = normalizeCounterKey(trimmed)
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
    .slice(0, limit)
    .map((item) => ({ text: item.label, count: item.count }))
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function safeStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit)
}

function mapBusinessLifecycleToBucket(lifecycle: string | null | undefined): LifecycleBucket {
  if (lifecycle === 'RECURRENT') return 'recurrent'
  if (lifecycle === 'NEW') return 'new'
  return 'unknown'
}

function createLifecycleAccumulatorMap(): Record<LifecycleBucket, LifecycleAccumulator> {
  return {
    new: {
      key: 'new',
      label: 'Negocio Nuevo',
      meetingsCompleted: 0,
      todosCompleted: 0,
      agreementsYes: 0,
      agreementsNo: 0,
    },
    recurrent: {
      key: 'recurrent',
      label: 'Negocio Recurrente',
      meetingsCompleted: 0,
      todosCompleted: 0,
      agreementsYes: 0,
      agreementsNo: 0,
    },
    unknown: {
      key: 'unknown',
      label: 'Negocio Sin Clasificar',
      meetingsCompleted: 0,
      todosCompleted: 0,
      agreementsYes: 0,
      agreementsNo: 0,
    },
  }
}

function toLifecycleSegments(accumulator: Record<LifecycleBucket, LifecycleAccumulator>): WeeklyTaskLifecycleSegment[] {
  return (Object.keys(accumulator) as LifecycleBucket[]).map((key) => {
    const item = accumulator[key]
    const denominator = item.agreementsYes + item.agreementsNo
    const agreementRatePct = denominator > 0 ? (item.agreementsYes / denominator) * 100 : 0

    return {
      key: item.key,
      label: item.label,
      meetingsCompleted: item.meetingsCompleted,
      todosCompleted: item.todosCompleted,
      agreementsYes: item.agreementsYes,
      agreementsNo: item.agreementsNo,
      agreementRatePct,
    }
  })
}

function computePerformerScore(perf: PerformerAccumulator): number {
  const agreementSample = perf.agreementsYes + perf.agreementsNo
  const agreementRate = agreementSample > 0 ? perf.agreementsYes / agreementSample : 0

  return (
    perf.meetingsCompleted * 3 +
    perf.todosCompleted +
    perf.proposalsSent * 3 +
    perf.wins * 5 -
    perf.losses +
    agreementRate * 4 -
    perf.agreementsNo
  )
}

function formatUserDisplayName(name: string | null | undefined, email: string | null | undefined, fallbackId: string): string {
  if (name && name.trim()) return name.trim()
  if (email && email.trim()) return email.trim()
  return `Usuario ${fallbackId.slice(0, 8)}`
}

function pickStrongAndWeakPerformers(performers: WeeklyTaskReportPerformer[]): {
  strongPerformers: WeeklyTaskReportPerformer[]
  weakPerformers: WeeklyTaskReportPerformer[]
} {
  const eligible = performers.filter((perf) => perf.meetingsCompleted + perf.todosCompleted >= MIN_ACTIVITY_FOR_RANKING)

  if (eligible.length === 0) {
    return { strongPerformers: [], weakPerformers: [] }
  }

  const strongPerformers = [...eligible].sort((a, b) => b.score - a.score).slice(0, 3)

  const weakPool = [...eligible].sort((a, b) => a.score - b.score)
  const strongNames = new Set(strongPerformers.map((p) => p.name))
  const weakPerformers = weakPool.filter((perf) => !strongNames.has(perf.name)).slice(0, 3)

  return { strongPerformers, weakPerformers }
}

async function buildPeriodSnapshot(startAt: Date, endAt: Date): Promise<PeriodSnapshot> {
  const [createdGroups, completedTasks, stageUpdates] = await Promise.all([
    prisma.task.groupBy({
      by: ['category'],
      where: {
        createdAt: {
          gte: startAt,
          lt: endAt,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.task.findMany({
      where: {
        completed: true,
        updatedAt: {
          gte: startAt,
          lt: endAt,
        },
      },
      select: {
        category: true,
        notes: true,
        opportunity: {
          select: {
            responsibleId: true,
            business: {
              select: {
                businessLifecycle: true,
              },
            },
          },
        },
      },
    }),
    prisma.opportunity.findMany({
      where: {
        updatedAt: {
          gte: startAt,
          lt: endAt,
        },
        stage: {
          in: ['propuesta_enviada', 'won', 'lost'],
        },
        responsibleId: {
          not: null,
        },
      },
      select: {
        responsibleId: true,
        stage: true,
        lostReason: true,
        business: {
          select: {
            businessLifecycle: true,
          },
        },
      },
    }),
  ])

  const createdMeetings = createdGroups.find((group) => group.category === 'meeting')?._count._all || 0
  const createdTodos = createdGroups.find((group) => group.category === 'todo')?._count._all || 0
  const createdTotal = createdMeetings + createdTodos

  let completedMeetings = 0
  let completedTodos = 0
  let agreementsYes = 0
  let agreementsNo = 0
  let agreementsUnknown = 0

  const objectionInputs: string[] = []
  const lifecycleAccumulator = createLifecycleAccumulatorMap()

  const responsibleIds = new Set<string>()
  for (const task of completedTasks) {
    if (task.opportunity.responsibleId) {
      responsibleIds.add(task.opportunity.responsibleId)
    }
  }
  for (const update of stageUpdates) {
    if (update.responsibleId) {
      responsibleIds.add(update.responsibleId)
    }
  }

  const userProfiles = responsibleIds.size > 0
    ? await prisma.userProfile.findMany({
        where: {
          clerkId: {
            in: [...responsibleIds],
          },
        },
        select: {
          clerkId: true,
          name: true,
          email: true,
        },
      })
    : []

  const userMap = new Map(userProfiles.map((profile) => [profile.clerkId, profile]))
  const performerMap = new Map<string, PerformerAccumulator>()

  const ensurePerformer = (userId: string): PerformerAccumulator => {
    const existing = performerMap.get(userId)
    if (existing) return existing

    const profile = userMap.get(userId)
    const performer: PerformerAccumulator = {
      userId,
      name: formatUserDisplayName(profile?.name, profile?.email, userId),
      email: profile?.email ?? null,
      meetingsCompleted: 0,
      todosCompleted: 0,
      agreementsYes: 0,
      agreementsNo: 0,
      proposalsSent: 0,
      wins: 0,
      losses: 0,
    }

    performerMap.set(userId, performer)
    return performer
  }

  for (const task of completedTasks) {
    const responsibleId = task.opportunity.responsibleId
    const performer = responsibleId ? ensurePerformer(responsibleId) : null
    const lifecycleBucket = mapBusinessLifecycleToBucket(task.opportunity.business?.businessLifecycle)
    const lifecycle = lifecycleAccumulator[lifecycleBucket]

    if (task.category === 'meeting') {
      completedMeetings += 1
      if (performer) performer.meetingsCompleted += 1
      lifecycle.meetingsCompleted += 1

      const meetingData = parseMeetingNotes(task.notes)

      if (meetingData.reachedAgreement === 'si') {
        agreementsYes += 1
        if (performer) performer.agreementsYes += 1
        lifecycle.agreementsYes += 1
      } else if (meetingData.reachedAgreement === 'no') {
        agreementsNo += 1
        if (performer) performer.agreementsNo += 1
        lifecycle.agreementsNo += 1

        if (meetingData.mainObjection) {
          objectionInputs.push(meetingData.mainObjection)
        }
      } else {
        agreementsUnknown += 1
      }
    } else if (task.category === 'todo') {
      completedTodos += 1
      if (performer) performer.todosCompleted += 1
      lifecycle.todosCompleted += 1
    }
  }

  for (const update of stageUpdates) {
    if (!update.responsibleId) continue

    const performer = ensurePerformer(update.responsibleId)

    if (update.stage === 'propuesta_enviada') {
      performer.proposalsSent += 1
    } else if (update.stage === 'won') {
      performer.wins += 1
    } else if (update.stage === 'lost') {
      performer.losses += 1
      if (update.lostReason?.trim()) {
        objectionInputs.push(update.lostReason.trim())
      }
    }
  }

  const performerStats: WeeklyTaskReportPerformer[] = [...performerMap.values()]
    .map((perf) => ({
      name: perf.name,
      meetingsCompleted: perf.meetingsCompleted,
      todosCompleted: perf.todosCompleted,
      agreementsYes: perf.agreementsYes,
      agreementsNo: perf.agreementsNo,
      wins: perf.wins,
      proposalsSent: perf.proposalsSent,
      score: computePerformerScore(perf),
    }))
    .sort((a, b) => b.score - a.score)

  return {
    startAt,
    endAt,
    createdTotal,
    createdMeetings,
    createdTodos,
    completedTotal: completedMeetings + completedTodos,
    completedMeetings,
    completedTodos,
    agreementsYes,
    agreementsNo,
    agreementsUnknown,
    objections: countTopTexts(objectionInputs, MAX_OBJECTION_ITEMS),
    performerStats,
    lifecycleSegments: toLifecycleSegments(lifecycleAccumulator),
  }
}

function buildFallbackInsights(payload: AiInputPayload): WeeklyTaskReportInsights {
  const meetingTrend = payload.trend.meetingsDelta
  const todoTrend = payload.trend.todosDelta
  const agreementTrend = payload.trend.agreementRateDeltaPct

  const trendHighlights = [
    `Reuniones completadas: ${payload.metrics.completedMeetings} (${meetingTrend >= 0 ? '+' : ''}${meetingTrend} vs semana anterior).`,
    `To-dos completados: ${payload.metrics.completedTodos} (${todoTrend >= 0 ? '+' : ''}${todoTrend} vs semana anterior).`,
    `Tasa de acuerdo: ${payload.metrics.agreementRatePct.toFixed(1)}% (${agreementTrend >= 0 ? '+' : ''}${agreementTrend.toFixed(1)} pp).`,
  ]

  const bestPractices = [
    'Estandarizar cierre de reunión con próximos pasos concretos y fecha definida.',
    'Replicar scripts y secuencias de seguimiento de los usuarios top en todo el equipo.',
    'Usar objeciones repetidas para actualizar el playbook comercial semanalmente.',
  ]

  const actionPlan7d = [
    'Revisión de pipeline por vendedor enfocada en reuniones sin avance de etapa.',
    'Entrenamiento táctico sobre las 3 objeciones más frecuentes con role-play.',
    'Meta semanal por vendedor: mínimo 1 propuesta enviada tras reuniones con acuerdo.',
  ]

  const actionPlan30d = [
    'Implementar scorecard comercial estándar con objetivos por etapa del pipeline.',
    'Crear biblioteca de respuestas por objeción con ejemplos de casos ganados.',
    'Auditar semanalmente calidad de notas y consistencia en captura de acuerdos.',
  ]

  const weakPerformerCoaching = [
    '1:1 quincenal para revisar conversión reunión->propuesta y plan de mejora.',
    'Acompañamiento en llamadas/reuniones clave con feedback estructurado.',
    'Seguimiento de compromisos de mejora en tablero visible para dirección.',
  ]

  return {
    executiveSummary:
      'La semana muestra señales útiles para optimizar la ejecución comercial. Prioridad: elevar conversión de reuniones con acuerdo hacia propuesta y fortalecer coaching a usuarios con menor tracción.',
    trendHighlights,
    bestPractices,
    actionPlan7d,
    actionPlan30d,
    weakPerformerCoaching,
  }
}

async function generateAiInsights(payload: AiInputPayload): Promise<WeeklyTaskReportInsights> {
  const openai = getOpenAIClient()
  const startedAt = Date.now()

  logger.info('[WeeklyTaskReport] OpenAI analysis request started', {
    model: 'gpt-4.1',
    periodLabel: payload.periodLabel,
    meetingsCompleted: payload.metrics.completedMeetings,
    todosCompleted: payload.metrics.completedTodos,
    agreementsYes: payload.metrics.agreementsYes,
    agreementsNo: payload.metrics.agreementsNo,
    strongPerformers: payload.strongPerformers.length,
    weakPerformers: payload.weakPerformers.length,
    objections: payload.objections.length,
  })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0.2,
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content:
          'Eres Director Comercial B2B en español. Analiza desempeño semanal del equipo de ventas con foco en decisiones accionables. Evita vaguedades. Responde SOLO JSON válido.',
      },
      {
        role: 'user',
        content: `Con los siguientes datos semanales, devuelve SOLO JSON con esta estructura exacta:\n\n{\n  "executiveSummary": string,\n  "trendHighlights": string[],\n  "bestPractices": string[],\n  "actionPlan7d": string[],\n  "actionPlan30d": string[],\n  "weakPerformerCoaching": string[]\n}\n\nReglas:\n- Español profesional y directo.\n- Máximo 6 elementos por arreglo.\n- Cada acción debe ser concreta y medible.\n- Señala patrones de desempeño y objeciones recurrentes.\n- Usa los usuarios fuertes y débiles como base para recomendaciones de coaching.\n\nDatos:\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  })

  const rawContent = completion.choices[0]?.message?.content?.trim() || ''
  const durationMs = Date.now() - startedAt

  logger.info('[WeeklyTaskReport] OpenAI analysis response received', {
    model: 'gpt-4.1',
    durationMs,
    outputChars: rawContent.length,
    finishReason: completion.choices[0]?.finish_reason || null,
  })

  const parsed = rawContent ? extractJsonObject(rawContent) : null

  if (!parsed) {
    throw new Error('No se pudo parsear JSON del análisis AI semanal')
  }

  return {
    executiveSummary:
      safeString(parsed.executiveSummary) ||
      'Resumen no disponible por respuesta incompleta de IA.',
    trendHighlights: safeStringArray(parsed.trendHighlights, MAX_AI_ITEMS),
    bestPractices: safeStringArray(parsed.bestPractices, MAX_AI_ITEMS),
    actionPlan7d: safeStringArray(parsed.actionPlan7d, MAX_AI_ITEMS),
    actionPlan30d: safeStringArray(parsed.actionPlan30d, MAX_AI_ITEMS),
    weakPerformerCoaching: safeStringArray(parsed.weakPerformerCoaching, MAX_AI_ITEMS),
  }
}

export async function sendWeeklyTaskPerformanceReport(): Promise<SendWeeklyTaskReportResult> {
  const errors: string[] = []
  let sent = 0
  let failed = 0
  let skipped = 0

  try {
    const appBaseUrl = getAppBaseUrl()
    const now = new Date()
    const currentStart = new Date(now.getTime() - 7 * ONE_DAY_MS)
    const previousStart = new Date(currentStart.getTime() - 7 * ONE_DAY_MS)

    const [currentPeriod, previousPeriod, admins] = await Promise.all([
      buildPeriodSnapshot(currentStart, now),
      buildPeriodSnapshot(previousStart, currentStart),
      prisma.userProfile.findMany({
        where: {
          role: 'admin',
          isActive: true,
          email: { not: null },
        },
        select: {
          name: true,
          email: true,
        },
      }),
    ])

    if (admins.length === 0) {
      logger.warn('[WeeklyTaskReport] No active admins with email')
      return {
        success: true,
        sent: 0,
        failed: 0,
        skipped: 1,
        errors: [],
        summary: {
          periodStart: formatDateForPanama(currentPeriod.startAt),
          periodEnd: formatDateForPanama(currentPeriod.endAt),
          meetingsCompleted: currentPeriod.completedMeetings,
          todosCompleted: currentPeriod.completedTodos,
          agreementsYes: currentPeriod.agreementsYes,
          agreementsNo: currentPeriod.agreementsNo,
          topObjections: currentPeriod.objections.slice(0, 5),
          strongPerformers: [],
          weakPerformers: [],
        },
      }
    }

    const currentAgreementDenominator = currentPeriod.agreementsYes + currentPeriod.agreementsNo
    const previousAgreementDenominator = previousPeriod.agreementsYes + previousPeriod.agreementsNo

    const currentAgreementRatePct = currentAgreementDenominator > 0
      ? (currentPeriod.agreementsYes / currentAgreementDenominator) * 100
      : 0

    const previousAgreementRatePct = previousAgreementDenominator > 0
      ? (previousPeriod.agreementsYes / previousAgreementDenominator) * 100
      : 0

    const { strongPerformers, weakPerformers } = pickStrongAndWeakPerformers(currentPeriod.performerStats)

    const periodLabel = `${formatDateForPanama(currentPeriod.startAt)} al ${formatDateForPanama(currentPeriod.endAt)}`
    const generatedAtLabel = formatDateTimeForPanama(now)

    const aiPayload: AiInputPayload = {
      periodLabel,
      metrics: {
        completedMeetings: currentPeriod.completedMeetings,
        completedTodos: currentPeriod.completedTodos,
        agreementsYes: currentPeriod.agreementsYes,
        agreementsNo: currentPeriod.agreementsNo,
        agreementRatePct: currentAgreementRatePct,
      },
      trend: {
        meetingsDelta: currentPeriod.completedMeetings - previousPeriod.completedMeetings,
        todosDelta: currentPeriod.completedTodos - previousPeriod.completedTodos,
        agreementRateDeltaPct: currentAgreementRatePct - previousAgreementRatePct,
      },
      lifecycleSegments: currentPeriod.lifecycleSegments,
      objections: currentPeriod.objections.slice(0, 5),
      strongPerformers,
      weakPerformers,
    }

    let insights = buildFallbackInsights(aiPayload)

    try {
      logger.info('[WeeklyTaskReport] Attempting OpenAI analysis for weekly report')
      insights = await generateAiInsights(aiPayload)
      logger.info('[WeeklyTaskReport] OpenAI analysis applied successfully', {
        trendHighlights: insights.trendHighlights.length,
        bestPractices: insights.bestPractices.length,
        actionPlan7d: insights.actionPlan7d.length,
        actionPlan30d: insights.actionPlan30d.length,
        weakPerformerCoaching: insights.weakPerformerCoaching.length,
      })
    } catch (aiError) {
      const aiErrorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI error'
      logger.error('[WeeklyTaskReport] AI generation failed, using fallback:', aiError)
      logger.info('[WeeklyTaskReport] Using deterministic fallback insights')
      errors.push(`AI fallback used: ${aiErrorMessage}`)
    }

    const uniqueRecipients = [...new Set(admins.map((admin) => admin.email).filter((email): email is string => Boolean(email)))]

    if (uniqueRecipients.length === 0) {
      skipped += 1
      return {
        success: true,
        sent,
        failed,
        skipped,
        errors,
        summary: {
          periodStart: formatDateForPanama(currentPeriod.startAt),
          periodEnd: formatDateForPanama(currentPeriod.endAt),
          meetingsCompleted: currentPeriod.completedMeetings,
          todosCompleted: currentPeriod.completedTodos,
          agreementsYes: currentPeriod.agreementsYes,
          agreementsNo: currentPeriod.agreementsNo,
          topObjections: currentPeriod.objections.slice(0, 5),
          strongPerformers: strongPerformers.map((perf) => perf.name),
          weakPerformers: weakPerformers.map((perf) => perf.name),
        },
      }
    }

    for (const recipientEmail of uniqueRecipients) {
      const recipient = admins.find((admin) => admin.email === recipientEmail)
      const userName = formatUserDisplayName(recipient?.name, recipientEmail, recipientEmail)

      const html = renderWeeklyTaskReportEmail({
        userName,
        periodLabel,
        generatedAtLabel,
        appBaseUrl,
        metrics: {
          completedTotal: currentPeriod.completedTotal,
          createdTotal: currentPeriod.createdTotal,
          meetingsCompleted: currentPeriod.completedMeetings,
          todosCompleted: currentPeriod.completedTodos,
          agreementsYes: currentPeriod.agreementsYes,
          agreementsNo: currentPeriod.agreementsNo,
          agreementRatePct: currentAgreementRatePct,
        },
        trends: {
          meetingsDelta: currentPeriod.completedMeetings - previousPeriod.completedMeetings,
          todosDelta: currentPeriod.completedTodos - previousPeriod.completedTodos,
          agreementRateDeltaPct: currentAgreementRatePct - previousAgreementRatePct,
        },
        lifecycleSegments: currentPeriod.lifecycleSegments,
        topObjections: currentPeriod.objections.slice(0, 5),
        strongPerformers,
        weakPerformers,
        insights,
      })

      try {
        const { error } = await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: recipientEmail,
          replyTo: EMAIL_CONFIG.replyTo,
          subject: `Reporte Semanal Comercial (${periodLabel}) - OfertaSimple`,
          html,
        })

        if (error) {
          failed += 1
          errors.push(`${recipientEmail}: ${error.message}`)
        } else {
          sent += 1
        }
      } catch (sendError) {
        const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown send error'
        failed += 1
        errors.push(`${recipientEmail}: ${errorMessage}`)
      }
    }

    logger.info('[WeeklyTaskReport] Completed weekly report email run', {
      sent,
      failed,
      skipped,
      recipients: uniqueRecipients.length,
      meetings: currentPeriod.completedMeetings,
      todos: currentPeriod.completedTodos,
      agreementsYes: currentPeriod.agreementsYes,
      agreementsNo: currentPeriod.agreementsNo,
    })

    return {
      success: failed === 0,
      sent,
      failed,
      skipped,
      errors,
      summary: {
        periodStart: formatDateForPanama(currentPeriod.startAt),
        periodEnd: formatDateForPanama(currentPeriod.endAt),
        meetingsCompleted: currentPeriod.completedMeetings,
        todosCompleted: currentPeriod.completedTodos,
        agreementsYes: currentPeriod.agreementsYes,
        agreementsNo: currentPeriod.agreementsNo,
        topObjections: currentPeriod.objections.slice(0, 5),
        strongPerformers: strongPerformers.map((perf) => perf.name),
        weakPerformers: weakPerformers.map((perf) => perf.name),
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[WeeklyTaskReport] Fatal error:', error)
    return {
      success: false,
      sent,
      failed,
      skipped,
      errors: [...errors, errorMessage],
    }
  }
}
