import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'
import { aiLimiter, applyRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    // Authentication check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Apply AI rate limiting (20 req/min)
    const rateLimitResult = await applyRateLimit(
      aiLimiter,
      userId,
      'Demasiadas solicitudes de IA. Espera un momento antes de generar más contenido.'
    )
    if (rateLimitResult) return rateLimitResult

    const { description, price } = await req.json()
    const safeDescription = typeof description === 'string' ? description.trim() : ''

    const openai = getOpenAIClient()
    
    const normalizedPrice = typeof price === 'string' ? price.trim() : ''

    const prompt = `Corrige y pule la siguiente descripción de opción de oferta en español, manteniendo el significado exacto.

Reglas:
- Corrige ortografía, acentos y puntuación.
- Mantén tono comercial claro y natural.
- No inventes información.
- El resultado DEBE iniciar con el formato: "Paga $x por ...".
- Usa exactamente este precio en "x": ${normalizedPrice || 'X'}.
- Si el texto original ya trae horarios o condiciones, intégralos después sin inventar datos.
- Devuelve solo el texto final, sin comillas ni explicaciones.

Si la descripción original está vacía:
- No inventes detalles.
- Devuelve una frase base útil siguiendo el formato, por ejemplo: "Paga $x por esta oferta".

Descripción original:
${safeDescription || '(vacía)'}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: 'Eres un editor experto en redacción comercial de ofertas en español.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 180,
    })

    const proofreadDescription = completion.choices[0]?.message?.content?.trim()
    if (!proofreadDescription) {
      return NextResponse.json({ error: 'No se pudo corregir la descripción.' }, { status: 500 })
    }

    return NextResponse.json({ description: proofreadDescription })
  } catch (error) {
    logger.error('AI proofread-offer-description error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
