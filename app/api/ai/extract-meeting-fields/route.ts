import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'
import { aiLimiter, applyRateLimit } from '@/lib/rate-limit'

const MAX_INPUT_CHARS = 6000

type YesNo = 'si' | 'no'
type DecisionMaker = 'si' | 'no' | 'no_se'

interface ExtractedMeetingFields {
  meetingWith: string | null
  position: string | null
  isDecisionMaker: DecisionMaker | null
  meetingHappened: YesNo | null
  reachedAgreement: YesNo | null
  mainObjection: string | null
  objectionSolution: string | null
  nextSteps: string | null
}

function normalizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'n/a') return null
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized
}

function normalizeYesNo(value: unknown): YesNo | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'si' || normalized === 'sí') return 'si'
  if (normalized === 'no') return 'no'
  return null
}

function normalizeDecisionMaker(value: unknown): DecisionMaker | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'si' || normalized === 'sí') return 'si'
  if (normalized === 'no') return 'no'
  if (normalized === 'no_se' || normalized === 'no sé') return 'no_se'
  return null
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
            'Extrae datos estructurados de notas de reunión en español para CRM. Devuelve SOLO JSON válido. No inventes datos: si no está explícito, usa null.',
        },
        {
          role: 'user',
          content: `Extrae del siguiente texto los campos y responde SOLO con JSON válido:\n\n{
  "meetingWith": string|null,
  "position": string|null,
  "isDecisionMaker": "si"|"no"|"no_se"|null,
  "meetingHappened": "si"|"no"|null,
  "reachedAgreement": "si"|"no"|null,
  "mainObjection": string|null,
  "objectionSolution": string|null,
  "nextSteps": string|null
}

Reglas:
- No adivinar ni inferir fuerte.
- Si el texto no lo dice claramente, null.
- Mantén textos extraídos en español.

Texto:
${normalizedText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 600,
    })

    const content = completion.choices[0]?.message?.content?.trim() || ''
    if (!content) {
      return NextResponse.json({ error: 'No se pudo extraer información.' }, { status: 500 })
    }

    const parsed = extractJsonObject(content)
    if (!parsed) {
      return NextResponse.json({ error: 'Respuesta inválida del extractor.' }, { status: 500 })
    }

    const fields: ExtractedMeetingFields = {
      meetingWith: normalizeString(parsed.meetingWith, 200),
      position: normalizeString(parsed.position, 200),
      isDecisionMaker: normalizeDecisionMaker(parsed.isDecisionMaker),
      meetingHappened: normalizeYesNo(parsed.meetingHappened),
      reachedAgreement: normalizeYesNo(parsed.reachedAgreement),
      mainObjection: normalizeString(parsed.mainObjection, 800),
      objectionSolution: normalizeString(parsed.objectionSolution, 1200),
      nextSteps: normalizeString(parsed.nextSteps, 1200),
    }

    return NextResponse.json({ fields })
  } catch (error) {
    logger.error('AI extract-meeting-fields error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
