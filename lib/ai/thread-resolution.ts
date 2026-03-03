import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'

const MAX_THREAD_TITLE_CHARS = 200
const MAX_COMMENT_CHARS = 1000
const MAX_COMMENTS_FOR_PROMPT = 20
const MAX_RESPONSE_CHARS = 160

export interface ThreadResolutionCommentInput {
  authorName: string
  content: string
}

export interface GenerateThreadResolutionInput {
  threadTitle: string
  comments: ThreadResolutionCommentInput[]
}

export interface GeneratedThreadResolution {
  text: string
  usedFallback: boolean
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

function buildFallbackResolutionLine(lastComment: string | null): string {
  const cleanLastComment = normalizeWhitespace(lastComment || '')
  if (!cleanLastComment) {
    return 'Decisión: Item resuelto.'
  }

  return `Decisión: ${truncate(cleanLastComment, 130)}`
}

function normalizeResolutionOneLiner(raw: string): string {
  const compact = normalizeWhitespace(raw)
  if (!compact) return ''

  const withDecisionPrefix = /^decisi[oó]n:/i.test(compact)
    ? compact
    : `Decisión: ${compact}`

  return truncate(withDecisionPrefix, MAX_RESPONSE_CHARS)
}

export async function generateThreadResolutionOneLiner(
  input: GenerateThreadResolutionInput
): Promise<GeneratedThreadResolution> {
  const normalizedTitle = truncate(normalizeWhitespace(input.threadTitle || ''), MAX_THREAD_TITLE_CHARS)

  const normalizedComments = input.comments
    .map((comment) => ({
      authorName: truncate(normalizeWhitespace(comment.authorName || 'Usuario'), 80),
      content: truncate(normalizeWhitespace(comment.content || ''), MAX_COMMENT_CHARS),
    }))
    .filter((comment) => comment.content.length > 0)
    .slice(-MAX_COMMENTS_FOR_PROMPT)

  const fallback = buildFallbackResolutionLine(
    normalizedComments.length > 0 ? normalizedComments[normalizedComments.length - 1].content : null
  )

  try {
    const commentsText = normalizedComments
      .map((comment, index) => `${index + 1}. ${comment.authorName}: ${comment.content}`)
      .join('\n')

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.2,
      max_tokens: 80,
      messages: [
        {
          role: 'system',
          content:
            'Eres asistente comercial en español. Responde lo MÁS CORTO posible. Debes responder EXACTAMENTE una sola línea con formato: "Decisión: ...". Sin saltos de línea.',
        },
        {
          role: 'user',
          content: `Genera la resolución para este item de chat.\nTítulo: ${normalizedTitle || 'Item sin título'}\nMensajes:\n${commentsText || 'Sin mensajes'}\n\nReglas:\n- Una sola línea.\n- Lo más breve posible.\n- Claro y accionable.\n- Máximo 120 caracteres.\n- Solo una decisión final breve, sin siguiente paso.`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content || ''
    const normalizedOutput = normalizeResolutionOneLiner(raw)

    if (!normalizedOutput) {
      throw new Error('AI resolution response was empty')
    }

    return {
      text: normalizedOutput,
      usedFallback: false,
    }
  } catch (error) {
    logger.error('Failed to generate AI resolution line, using fallback:', error)
    return {
      text: fallback,
      usedFallback: true,
    }
  }
}
