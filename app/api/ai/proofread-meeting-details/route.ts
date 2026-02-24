import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'
import { aiLimiter, applyRateLimit } from '@/lib/rate-limit'

const MAX_INPUT_CHARS = 6000
const MAX_OUTPUT_CHARS = 6000

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

    const { text } = await req.json()
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }

    const normalizedText = text.trim()
    if (normalizedText.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: `El texto excede el límite de ${MAX_INPUT_CHARS} caracteres.` },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente de ventas en español. Corrige ortografía, gramática, puntuación y claridad del texto de una reunión. Mantén el significado exacto y el tono profesional. No inventes datos, no agregues información nueva y no elimines detalles importantes.',
        },
        {
          role: 'user',
          content: `Corrige el siguiente texto de la reunión y responde SOLO con la versión corregida:\n\n${normalizedText}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    })

    let result = completion.choices[0]?.message?.content?.trim() || ''
    if (!result) {
      return NextResponse.json({ error: 'No se pudo corregir el texto.' }, { status: 500 })
    }

    if (result.length > MAX_OUTPUT_CHARS) {
      result = result.slice(0, MAX_OUTPUT_CHARS)
    }

    return NextResponse.json({ text: result })
  } catch (error) {
    logger.error('AI proofread-meeting-details error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
