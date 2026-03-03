import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { logger } from '@/lib/logger'
import { aiLimiter, applyRateLimit } from '@/lib/rate-limit'
import {
  generateThreadResolutionOneLiner,
  type ThreadResolutionCommentInput,
} from '@/lib/ai/thread-resolution'

const MAX_THREAD_TITLE_CHARS = 200
const MAX_COMMENTS = 50
const MAX_COMMENT_CHARS = 1200

function normalizeCommentInput(value: unknown): ThreadResolutionCommentInput[] | null {
  if (!Array.isArray(value)) return null
  if (value.length > MAX_COMMENTS) return null

  const comments: ThreadResolutionCommentInput[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null

    const authorName = 'authorName' in entry ? entry.authorName : null
    const content = 'content' in entry ? entry.content : null

    if (typeof authorName !== 'string' || typeof content !== 'string') {
      return null
    }

    const normalizedAuthorName = authorName.trim()
    const normalizedContent = content.trim()

    if (!normalizedAuthorName || !normalizedContent) {
      return null
    }

    if (normalizedContent.length > MAX_COMMENT_CHARS) {
      return null
    }

    comments.push({
      authorName: normalizedAuthorName,
      content: normalizedContent,
    })
  }

  return comments
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rateLimitResult = await applyRateLimit(
      aiLimiter,
      userId,
      'Demasiadas solicitudes de IA. Espera un momento antes de intentar de nuevo.'
    )
    if (rateLimitResult) return rateLimitResult

    const { threadTitle, comments } = await req.json()

    if (!threadTitle || typeof threadTitle !== 'string' || !threadTitle.trim()) {
      return NextResponse.json({ error: 'threadTitle es requerido' }, { status: 400 })
    }

    const normalizedTitle = threadTitle.trim()
    if (normalizedTitle.length > MAX_THREAD_TITLE_CHARS) {
      return NextResponse.json(
        { error: `threadTitle excede ${MAX_THREAD_TITLE_CHARS} caracteres.` },
        { status: 400 }
      )
    }

    const normalizedComments = normalizeCommentInput(comments)
    if (!normalizedComments) {
      return NextResponse.json(
        { error: 'comments inválido. Debe ser un arreglo de { authorName, content } válido.' },
        { status: 400 }
      )
    }

    const result = await generateThreadResolutionOneLiner({
      threadTitle: normalizedTitle,
      comments: normalizedComments,
    })

    return NextResponse.json({
      resolution: result.text,
      usedFallback: result.usedFallback,
    })
  } catch (error) {
    logger.error('AI generate-thread-resolution error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
