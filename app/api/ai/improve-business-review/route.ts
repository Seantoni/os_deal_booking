import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    // Authentication check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { text } = await req.json()
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const prompt = `Mejora la siguiente reseña del negocio en español. Mantén el significado, hazla más clara y atractiva. No inventes información nueva, solo reescribe lo que ya está. Texto:\n\n${text}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un asistente que reescribe reseñas de negocio en español de forma clara y concisa.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 300,
    })

    const improved = completion.choices[0]?.message?.content?.trim()
    if (!improved) {
      return NextResponse.json({ error: 'No se pudo generar la reseña.' }, { status: 500 })
    }

    return NextResponse.json({ text: improved })
  } catch (error) {
    logger.error('AI improve-business-review error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
