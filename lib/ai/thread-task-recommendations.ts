import { aiComplete } from './client'
import { logger } from '@/lib/logger'
import { isValidIsoCalendarDate } from '@/lib/utils/validation'

const MAX_THREAD_TITLE_CHARS = 200
const MAX_RESOLUTION_CHARS = 220
const MAX_COMMENT_CHARS = 1000
const MAX_COMMENTS_FOR_PROMPT = 20
const MAX_OPEN_TASKS_FOR_PROMPT = 20
const MAX_TASK_TITLE_CHARS = 160
const MAX_TASK_NOTES_CHARS = 1500
const MAX_REASON_CHARS = 220
const MAX_RECOMMENDATIONS = 3

type RecommendationConfidence = 'low' | 'medium' | 'high'

export interface ThreadTaskRecommendationCommentInput {
  authorName: string
  content: string
}

export interface ThreadTaskRecommendationOpenTaskInput {
  category: 'meeting' | 'todo'
  title: string
  dueDate: string | null
}

export interface GenerateThreadTaskRecommendationsInput {
  threadTitle: string
  resolutionNote: string | null
  comments: ThreadTaskRecommendationCommentInput[]
  todayDate: string
  opportunityStage: string | null
  businessName: string | null
  existingOpenTasks: ThreadTaskRecommendationOpenTaskInput[]
}

export interface ThreadTaskRecommendation {
  category: 'meeting' | 'todo'
  title: string
  notes: string | null
  dueDate: string | null
  reason: string | null
  confidence: RecommendationConfidence
}

export interface GeneratedThreadTaskRecommendations {
  recommendations: ThreadTaskRecommendation[]
  usedFallback: boolean
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

function normalizeOptionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'n/a') return null
  return truncate(normalized, maxLength)
}

function normalizeTaskCategory(value: unknown): 'meeting' | 'todo' {
  if (typeof value !== 'string') return 'todo'
  const normalized = value.trim().toLowerCase()
  return normalized === 'meeting' ? 'meeting' : 'todo'
}

function normalizeConfidence(value: unknown): RecommendationConfidence {
  if (typeof value !== 'string') return 'medium'
  const normalized = value.trim().toLowerCase()
  if (normalized === 'high') return 'high'
  if (normalized === 'low') return 'low'
  return 'medium'
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

function normalizeRecommendation(value: unknown): ThreadTaskRecommendation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>

  const title = normalizeOptionalString(record.title, MAX_TASK_TITLE_CHARS)
  if (!title) return null

  const rawDueDate =
    normalizeOptionalString(record.dueDate, 10) ||
    normalizeOptionalString(record.date, 10)
  const dueDate = rawDueDate && isValidIsoCalendarDate(rawDueDate) ? rawDueDate : null

  return {
    category: normalizeTaskCategory(record.category),
    title,
    notes: normalizeOptionalString(record.notes, MAX_TASK_NOTES_CHARS),
    dueDate,
    reason: normalizeOptionalString(record.reason, MAX_REASON_CHARS),
    confidence: normalizeConfidence(record.confidence),
  }
}

export async function generateThreadTaskRecommendations(
  input: GenerateThreadTaskRecommendationsInput
): Promise<GeneratedThreadTaskRecommendations> {
  const normalizedTitle = truncate(normalizeWhitespace(input.threadTitle || ''), MAX_THREAD_TITLE_CHARS)
  const normalizedResolution = input.resolutionNote
    ? truncate(normalizeWhitespace(input.resolutionNote), MAX_RESOLUTION_CHARS)
    : null

  const normalizedComments = input.comments
    .map((comment) => ({
      authorName: truncate(normalizeWhitespace(comment.authorName || 'Usuario'), 80),
      content: truncate(normalizeWhitespace(comment.content || ''), MAX_COMMENT_CHARS),
    }))
    .filter((comment) => comment.content.length > 0)
    .slice(-MAX_COMMENTS_FOR_PROMPT)

  const normalizedOpenTasks = input.existingOpenTasks
    .map((task) => ({
      category: task.category === 'meeting' ? 'meeting' : 'todo',
      title: truncate(normalizeWhitespace(task.title || ''), MAX_TASK_TITLE_CHARS),
      dueDate: task.dueDate && isValidIsoCalendarDate(task.dueDate) ? task.dueDate : null,
    }))
    .filter((task) => task.title.length > 0)
    .slice(0, MAX_OPEN_TASKS_FOR_PROMPT)

  try {
    const commentsText = normalizedComments.length
      ? normalizedComments
        .map((comment, index) => `${index + 1}. ${comment.authorName}: ${comment.content}`)
        .join('\n')
      : 'Sin comentarios'

    const openTasksText = normalizedOpenTasks.length
      ? normalizedOpenTasks
        .map((task, index) => {
          const dueDate = task.dueDate ? ` | fecha: ${task.dueDate}` : ''
          return `${index + 1}. [${task.category}] ${task.title}${dueDate}`
        })
        .join('\n')
      : 'Sin tareas abiertas'

    const content = await aiComplete({
      preset: 'analysis',
      messages: [
        {
          role: 'system',
          content:
            'Eres asistente comercial de CRM. Recomiendas tareas de seguimiento en español. Responde SOLO JSON válido sin texto extra.',
        },
        {
          role: 'user',
          content:
            `Genera recomendaciones de tareas para abrir después de resolver un item de chat.\n\n` +
            `Hoy: ${input.todayDate}\n` +
            `Empresa: ${input.businessName || 'Sin empresa'}\n` +
            `Etapa de oportunidad: ${input.opportunityStage || 'Sin etapa'}\n` +
            `Item: ${normalizedTitle || 'Sin título'}\n` +
            `Resolución final: ${normalizedResolution || 'Sin resolución'}\n\n` +
            `Comentarios del item:\n${commentsText}\n\n` +
            `Tareas abiertas actuales (NO duplicar):\n${openTasksText}\n\n` +
            'Devuelve SOLO este JSON:\n' +
            '{\n' +
            '  "recommendations": [\n' +
            '    {\n' +
            '      "category": "todo" | "meeting",\n' +
            '      "title": "string",\n' +
            '      "notes": "string | null",\n' +
            '      "dueDate": "YYYY-MM-DD | null",\n' +
            '      "reason": "string | null",\n' +
            '      "confidence": "high" | "medium" | "low"\n' +
            '    }\n' +
            '  ]\n' +
            '}\n\n' +
            'Reglas:\n' +
            '- Máximo 3 recomendaciones.\n' +
            '- Si no hay seguimiento accionable, devuelve [].\n' +
            '- Prioriza category="todo". Usa "meeting" solo si existe una próxima reunión clara.\n' +
            '- title breve, concreto y accionable (máximo 10 palabras).\n' +
            '- dueDate en formato YYYY-MM-DD usando la fecha de hoy para cálculos.\n' +
            '- No repetir tareas que ya están abiertas.\n' +
            '- No inventar datos críticos.\n',
        },
      ],
      maxTokens: 700,
      responseFormat: { type: 'json_object' },
    })
    if (!content) {
      throw new Error('AI recommendation response was empty')
    }

    const parsed = extractJsonObject(content)
    if (!parsed) {
      throw new Error('AI recommendation response could not be parsed')
    }

    const rawRecommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : Array.isArray(parsed.tasks)
        ? parsed.tasks
        : []

    const recommendations = rawRecommendations
      .map(normalizeRecommendation)
      .filter((recommendation): recommendation is ThreadTaskRecommendation => recommendation !== null)
      .slice(0, MAX_RECOMMENDATIONS)

    return {
      recommendations,
      usedFallback: false,
    }
  } catch (error) {
    logger.error('Failed to generate thread task recommendations, returning empty list:', error)
    return {
      recommendations: [],
      usedFallback: true,
    }
  }
}
