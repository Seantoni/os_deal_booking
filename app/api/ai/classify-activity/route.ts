import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'
import { aiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { isValidIsoCalendarDate } from '@/lib/utils/validation'

const MAX_INPUT_CHARS = 6000

interface ClassifiedActivity {
  category: 'meeting' | 'todo'
  // Task fields
  title: string | null
  notes: string | null
  dueDate: string | null
  // Meeting fields (only when category = 'meeting')
  meetingWith: string | null
  position: string | null
  isDecisionMaker: 'si' | 'no' | 'no_se' | null
  meetingDetails: string | null
  reachedAgreement: 'si' | 'no' | null
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

function normalizeYesNo(value: unknown): 'si' | 'no' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'si' || normalized === 'sí') return 'si'
  if (normalized === 'no') return 'no'
  return null
}

function normalizeDecisionMaker(value: unknown): 'si' | 'no' | 'no_se' | null {
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
          content: `Clasificas y extraes datos de actividades de CRM dictadas por voz en español. Determina si es una tarea o una reunión y extrae todos los campos relevantes. Devuelve SOLO JSON válido.\n\nFecha de referencia: hoy es ${dayOfWeek} ${today}.`,
        },
        {
          role: 'user',
          content: `Del siguiente texto dictado por voz, determina si describe una TAREA ("todo") o una REUNIÓN ("meeting") y extrae todos los campos. Responde SOLO con JSON válido:

{
  "category": "meeting"|"todo",
  "title": string|null,
  "notes": string|null,
  "dueDate": string|null,
  "meetingWith": string|null,
  "position": string|null,
  "isDecisionMaker": "si"|"no"|"no_se"|null,
  "meetingDetails": string|null,
  "reachedAgreement": "si"|"no"|null,
  "mainObjection": string|null,
  "objectionSolution": string|null,
  "nextSteps": string|null
}

Reglas de clasificación:
- Si menciona una persona con quien se reunió/reunirá, cargos, acuerdos, o usa palabras como "reunión", "me reuní", "nos vimos", "la cita": es "meeting".
- Si describe una acción a realizar, pendiente, recordatorio, o seguimiento sin contexto de reunión: es "todo".

Reglas de extracción:
- title: Frase corta (máx 10 palabras) que resume la actividad.
- notes: Para tareas, los detalles. Para reuniones, null (se usa meetingDetails).
- dueDate: Formato YYYY-MM-DD. Calcular desde hoy (${dayOfWeek} ${today}). "mañana" = +1 día, "en 4 días" = +4 días, "el viernes" = próximo viernes, etc.
- Campos de reunión (meetingWith, position, isDecisionMaker, meetingDetails, reachedAgreement, mainObjection, objectionSolution, nextSteps): Solo llenar si category = "meeting". Si es "todo", usar null.
- meetingDetails: Resumen completo de lo discutido, bien redactado.
- No inventar datos. Si no se menciona, usar null.
- Corregir ortografía y gramática.
- Todo en español.

Texto:
${normalizedText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 800,
    })

    const content = completion.choices[0]?.message?.content?.trim() || ''
    if (!content) {
      return NextResponse.json({ error: 'No se pudo clasificar la actividad.' }, { status: 500 })
    }

    const parsed = extractJsonObject(content)
    if (!parsed) {
      return NextResponse.json({ error: 'Respuesta inválida del clasificador.' }, { status: 500 })
    }

    const category = parsed.category === 'meeting' ? 'meeting' : 'todo'

    const rawDate = normalizeString(parsed.dueDate, 10)
    const validDate = rawDate && isValidIsoCalendarDate(rawDate) ? rawDate : null

    const fields: ClassifiedActivity = {
      category,
      title: normalizeString(parsed.title, 200),
      notes: category === 'todo' ? normalizeString(parsed.notes, 2000) : null,
      dueDate: validDate,
      meetingWith: category === 'meeting' ? normalizeString(parsed.meetingWith, 200) : null,
      position: category === 'meeting' ? normalizeString(parsed.position, 200) : null,
      isDecisionMaker: category === 'meeting' ? normalizeDecisionMaker(parsed.isDecisionMaker) : null,
      meetingDetails: category === 'meeting' ? normalizeString(parsed.meetingDetails, 3000) : null,
      reachedAgreement: category === 'meeting' ? normalizeYesNo(parsed.reachedAgreement) : null,
      mainObjection: category === 'meeting' ? normalizeString(parsed.mainObjection, 800) : null,
      objectionSolution: category === 'meeting' ? normalizeString(parsed.objectionSolution, 1200) : null,
      nextSteps: category === 'meeting' ? normalizeString(parsed.nextSteps, 1200) : null,
    }

    return NextResponse.json({ fields })
  } catch (error) {
    logger.error('AI classify-activity error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
