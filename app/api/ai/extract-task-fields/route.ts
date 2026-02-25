import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'
import { aiLimiter, applyRateLimit } from '@/lib/rate-limit'

const MAX_INPUT_CHARS = 6000

interface ExtractedTaskFields {
  title: string | null
  notes: string | null
  dueDate: string | null
}

function normalizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'n/a') return null
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized
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

    const { text, todayDate } = await req.json()
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

    const today = todayDate || new Date().toISOString().slice(0, 10)
    const todayObj = new Date(today + 'T12:00:00')
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const dayOfWeek = dayNames[todayObj.getDay()]

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            `Extrae título, notas y fecha de una descripción dictada de tarea en español para CRM. Devuelve SOLO JSON válido.\n\nFecha de referencia: hoy es ${dayOfWeek} ${today}.`,
        },
        {
          role: 'user',
          content: `Del siguiente texto dictado por voz, extrae un título conciso (máximo 10 palabras), las notas detalladas, y la fecha límite si se menciona. Responde SOLO con JSON válido:\n\n{
  "title": string|null,
  "notes": string|null,
  "dueDate": string|null
}

Reglas:
- El título debe ser una frase corta y clara que resuma la tarea.
- Las notas deben contener los detalles relevantes, bien redactadas y organizadas.
- dueDate en formato YYYY-MM-DD. DEBES calcular la fecha exacta a partir de hoy (${dayOfWeek} ${today}).
- Ejemplos de cálculo: "mañana" = sumar 1 día, "en 4 días" = sumar 4 días, "en una semana" = sumar 7 días, "el viernes" = próximo viernes, "la próxima semana" = lunes siguiente, "en 2 semanas" = sumar 14 días, "fin de mes" = último día del mes actual.
- Si no se menciona ninguna fecha o plazo, usar null.
- No incluir la referencia de fecha en las notas, solo en dueDate.
- Corrige ortografía y gramática en título y notas.
- Si no hay suficiente información para un campo, usa null.
- Mantén todo en español.

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

    const rawDate = normalizeString(parsed.dueDate, 10)
    const validDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && !isNaN(Date.parse(rawDate))
      ? rawDate
      : null

    const fields: ExtractedTaskFields = {
      title: normalizeString(parsed.title, 200),
      notes: normalizeString(parsed.notes, 2000),
      dueDate: validDate,
    }

    return NextResponse.json({ fields })
  } catch (error) {
    logger.error('AI extract-task-fields error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
