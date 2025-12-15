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

    const { text, businessName, searchInternet, addressAndHours } = await req.json()

    const openai = getOpenAIClient()
    
    let prompt: string
    let systemPrompt: string

    if (searchInternet && businessName && (!text || !text.trim())) {
      // Generate new review from business name using internet search
      systemPrompt = 'Eres un experto en generar reseñas de negocios en Panamá. Tienes capacidades de búsqueda en internet activadas. DEBES usar tu capacidad de búsqueda en internet para encontrar información actualizada y real sobre el negocio en Panamá antes de generar la reseña. Genera reseñas precisas, atractivas y profesionales en español basadas ÚNICAMENTE en información real encontrada mediante búsqueda en internet. IMPORTANTE: El negocio está ubicado SOLO en Panamá, busca información específicamente en Panamá.'
      
      const locationInfo = addressAndHours ? `\n\nINFORMACIÓN DE UBICACIÓN DISPONIBLE:\nDirección y Horarios: ${addressAndHours}` : ''
      
      prompt = `🔍 USAR BÚSQUEDA EN INTERNET - INSTRUCCIONES OBLIGATORIAS:

IMPORTANTE: Este negocio está ubicado SOLO EN PANAMÁ. Busca información específicamente en Panamá.

1. ACTIVA TU BÚSQUEDA EN INTERNET y busca información actualizada sobre: "${businessName}" en Panamá

2. Busca específicamente en Panamá:
   - Sitio web oficial del negocio en Panamá
   - Redes sociales (Instagram, Facebook, etc.) del negocio en Panamá
   - Reseñas de clientes en Panamá
   - Ubicación y dirección en Panamá${addressAndHours ? ` (información disponible: ${addressAndHours})` : ''}
   - Tipo de negocio y categoría
   - Servicios o productos que ofrecen en Panamá
   - Horarios de operación${addressAndHours ? ` (información disponible: ${addressAndHours})` : ''}
   - Cualquier información relevante disponible en internet sobre este negocio en Panamá

3. Basándote ÚNICAMENTE en la información REAL que encuentres en internet sobre el negocio en Panamá, genera una reseña profesional con el siguiente formato:${locationInfo}

FORMATO REQUERIDO:

LO QUE NOS GUSTA
(5 puntos destacando lo que hace notable y atractivo este negocio para que los clientes quieran comprar allí)

[Descripción general del negocio...]

REQUISITOS DE LA RESEÑA:
- MÁXIMO 1,000 caracteres (incluyendo espacios) - NO excedas este límite
- DEBE incluir la sección "LO QUE NOS GUSTA" con exactamente 5 puntos destacando aspectos notables y atractivos del negocio
- Los 5 puntos deben ser persuasivos y hacer que el cliente quiera comprar/visitar el negocio
- Basada en información REAL encontrada en internet sobre el negocio en Panamá
- En español
- Tono profesional pero amigable y vendedor
- Describir el tipo de negocio y características principales
- Informativa y atractiva
- Contextualizada para Panamá

EJEMPLO DE FORMATO:
LO QUE NOS GUSTA
• [Primer punto atractivo y notable]
• [Segundo punto atractivo y notable]
• [Tercer punto atractivo y notable]
• [Cuarto punto atractivo y notable]
• [Quinto punto atractivo y notable]

[Descripción del negocio...]

IMPORTANTE: 
- NO inventes información. Solo usa lo que encuentres en tu búsqueda en internet.
- El negocio está ubicado SOLO en Panamá - busca específicamente en Panamá.
- Los 5 puntos de "LO QUE NOS GUSTA" deben ser atractivos y persuasivos para motivar la compra.
- Si no encuentras información suficiente después de buscar en Panamá, genera una reseña genérica pero realista basada en el nombre del negocio y la información de ubicación proporcionada, siempre incluyendo los 5 puntos de "LO QUE NOS GUSTA".`
    } else if (text && text.trim()) {
      // Improve existing text
      systemPrompt = 'Eres un asistente que mejora reseñas de negocio en español. Si la reseña no tiene la sección "LO QUE NOS GUSTA" con 5 puntos, agrégala. Haz la reseña más clara, atractiva y persuasiva.'
      prompt = `Mejora la siguiente reseña del negocio en español. Mantén el significado, hazla más clara, atractiva y persuasiva. 

IMPORTANTE: Si la reseña NO incluye la sección "LO QUE NOS GUSTA" con 5 puntos, DEBES agregarla destacando aspectos notables y atractivos que hagan que el cliente quiera comprar/visitar el negocio.

Si ya tiene "LO QUE NOS GUSTA", mejórala asegurando que tenga exactamente 5 puntos atractivos y persuasivos.

Máximo 1,000 caracteres (incluyendo espacios).

Texto original:
${text}`
    } else {
      return NextResponse.json({ error: 'Texto o nombre del negocio requerido' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800, // Allow enough tokens for ~1,000 characters (Spanish: ~2.5 chars/token, so 800 tokens ≈ 2,000 chars max, but we'll truncate to 1,000)
    })

    let result = completion.choices[0]?.message?.content?.trim() || ''
    
    // Ensure it's exactly 1,000 characters or less
    if (result.length > 1000) {
      result = result.substring(0, 997) + '...'
    }

    if (!result) {
      return NextResponse.json({ error: 'No se pudo generar la reseña.' }, { status: 500 })
    }

    return NextResponse.json({ text: result })
  } catch (error) {
    logger.error('AI improve-business-review error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
