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

    const { description } = await req.json()
    const safeDescription = typeof description === 'string' ? description.trim() : ''

    const openai = getOpenAIClient()

    const prompt = `Genera el titulo de una opcion de oferta en espanol.

Reglas:
- Devuelve solo el nombre del producto o servicio.
- Si aplica, conserva detalles utiles como duracion, tamano, color, capacidad, cantidad o presentacion.
- Corrige ortografia, acentos y puntuacion solo dentro del nombre.
- Manten el texto claro y natural.
- No inventes informacion.
- No agregues precio, moneda, simbolos como "$", ni texto como "Paga", "Compra", "Llevate" o "Valor".
- No agregues horarios, condiciones, emojis, parentesis ni texto extra.
- Devuelve solo el titulo final, sin comillas ni explicaciones.

Si la descripción original está vacía:
- No inventes detalles.
- Devuelve una frase base util y neutra, por ejemplo: "Producto o servicio".

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
