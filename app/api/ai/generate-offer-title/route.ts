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

    const { description, price, realValue } = await req.json()
    const safeDescription = typeof description === 'string' ? description.trim() : ''
    const normalizedPrice = typeof price === 'string' ? price.trim() : ''
    const normalizedRealValue = typeof realValue === 'string' ? realValue.trim() : ''

    const openai = getOpenAIClient()

    const prompt = `Genera el titulo de una opción de oferta en español usando exactamente esta estructura:
"Paga $X por [descripción]${normalizedRealValue ? ' (Valor $Y)' : ''}"

Reglas:
- Corrige ortografía, acentos y puntuación solo dentro de la descripción.
- Mantén tono comercial claro y natural.
- No inventes información.
- Usa exactamente este precio para X: ${normalizedPrice || 'X'}.
- ${normalizedRealValue ? `Usa exactamente este valor real para Y: ${normalizedRealValue}.` : 'No agregues el segmento "(Valor $Y)" si no hay valor real.'}
- Conserva la descripción basada en el texto original, pero conviértela en una frase breve y limpia después de "por".
- No agregues horarios, condiciones, emojis ni texto extra fuera de la estructura.
- Devuelve solo el titulo final, sin comillas ni explicaciones.

Si la descripción original está vacía:
- No inventes detalles.
- Devuelve una frase base útil siguiendo el formato, por ejemplo: "Paga $${normalizedPrice || 'X'} por esta oferta${normalizedRealValue ? ` (Valor $${normalizedRealValue})` : ''}".

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

    const generatedTitle = completion.choices[0]?.message?.content?.trim()
    if (!generatedTitle) {
      return NextResponse.json({ error: 'No se pudo generar el título.' }, { status: 500 })
    }

    return NextResponse.json({ title: generatedTitle })
  } catch (error) {
    logger.error('AI generate-offer-title error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
