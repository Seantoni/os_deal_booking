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

    const { description, price, realValue, businessName } = await req.json()
    
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
    }

    const openai = getOpenAIClient()
    
    // Generate a short, engaging summary of the description
    const prompt = `Basándote en la siguiente descripción de oferta, genera un resumen muy corto (máximo 10 palabras) que capture la esencia de lo que incluye. Debe ser atractivo y directo. Solo responde con el resumen, sin puntuación final.

Descripción: ${description}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: 'Eres un experto en marketing que crea títulos de ofertas cortos y atractivos en español.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 50,
    })

    const summary = completion.choices[0]?.message?.content?.trim()
    if (!summary) {
      return NextResponse.json({ error: 'No se pudo generar el resumen.' }, { status: 500 })
    }

    // Build the title with the format: $X por [summary] en [businessName]. (Valor $Y)
    let title = `$${price || '0'} por ${summary}`
    if (businessName) {
      title += ` en ${businessName}`
    }
    if (realValue) {
      title += `. (Valor $${realValue})`
    }

    return NextResponse.json({ title, summary })
  } catch (error) {
    logger.error('AI generate-offer-title error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
