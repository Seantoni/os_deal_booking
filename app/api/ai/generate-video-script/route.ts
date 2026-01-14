import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'
import { aiLimiter, applyRateLimit, getClientIp } from '@/lib/rate-limit'

interface VideoScriptInput {
  businessName: string
  category?: string | null
  whatWeLike?: string | null
  aboutCompany?: string | null
  aboutOffer?: string | null
  goodToKnow?: string | null
  socialMedia?: string | null
  pricingOptions?: Array<{
    title?: string
    description?: string
    price?: string
    realValue?: string
  }> | null
}

const SYSTEM_PROMPT = `Eres un experto en creación de guiones para videos cortos de marketing en Panamá.
Tu tarea es crear guiones narrativos de 20-40 segundos para videos promocionales de ofertas.

ESTILO DEL GUION:
El guion debe ser NARRATIVO y FLUIDO, como si alguien estuviera contando una historia atractiva sobre el negocio.
NO uses formato estructurado con secciones entre corchetes. Escribe párrafos cortos y naturales.

ESTRUCTURA NARRATIVA:
1. APERTURA (1-2 líneas): Presenta el negocio de forma atractiva, mencionando qué lo hace especial
2. DESCRIPCIÓN (1-2 líneas): Explica qué ofrece y por qué es único
3. OFERTAS (3-5 líneas): Lista las ofertas específicas con precios y lo que incluyen. Usa formato como:
   - "Los viernes, paga $X por..."
   - "De lunes a viernes, paga $X por..."
   - "Los fines de semana, paga $X y consume $X en..."
4. CIERRE EMOCIONAL (1 línea): Una frase que invite a disfrutar la experiencia
5. LLAMADA A ACCIÓN (1 línea): "Compra ahora en ofertasimple.com o en nuestra app."

EJEMPLO DE TONO:
"En La Fishería, el sabor del mar y la cocina mediterránea se encuentran en un solo lugar.
Un restaurante con cevichería y gelatería artesanal que lo tiene TODO para disfrutar cualquier día de la semana.
Los viernes, paga $28 por dos pescados fritos con patacones, ensalada y dos cervezas nacionales.
De lunes a viernes, paga $39 por arañitas clásicas, dos pastas Alfredo con camarones y dos copas de sangría.
Y los fines de semana, paga $20 y consume $40 en alimentos y bebidas del menú.
Ya sea para un almuerzo tranquilo o una cena en pareja… aquí siempre hay algo que disfrutar.
Compra ahora en ofertasimple.com o en nuestra app."

REGLAS IMPORTANTES:
1. Usa español panameño natural y cercano
2. El tono debe ser cálido e invitador, no agresivo
3. Incluye TODOS los precios y lo que incluye cada oferta
4. Si hay múltiples opciones de precio, menciona cada una
5. NO uses hashtags ni emojis
6. NO uses formato de secciones [entre corchetes]
7. Escribe en párrafos cortos, una idea por línea
8. SIEMPRE termina con: "Compra ahora en ofertasimple.com o en nuestra app."

FORMATO DE SALIDA:
Devuelve el guion en texto corrido, párrafos cortos y naturales. Sin marcadores ni formato especial.`

export async function POST(request: NextRequest) {
  try {
    // Apply AI rate limiting (20 req/min)
    const { userId } = await auth()
    const identifier = userId || getClientIp(request)
    const rateLimitResult = await applyRateLimit(
      aiLimiter,
      identifier,
      'Demasiadas solicitudes de IA. Espera un momento antes de generar más contenido.'
    )
    if (rateLimitResult) return rateLimitResult

    const body = await request.json()
    const { formData } = body as { formData: VideoScriptInput }

    if (!formData?.businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    // Build context from available data
    const contextParts: string[] = []
    
    contextParts.push(`Negocio: ${formData.businessName}`)
    
    if (formData.category) {
      contextParts.push(`Categoría: ${formData.category}`)
    }
    
    if (formData.pricingOptions && formData.pricingOptions.length > 0) {
      const mainOption = formData.pricingOptions[0]
      if (mainOption.price && mainOption.realValue) {
        const discount = Math.round(
          ((parseFloat(mainOption.realValue) - parseFloat(mainOption.price)) / 
           parseFloat(mainOption.realValue)) * 100
        )
        contextParts.push(`Precio: $${mainOption.price} (Valor real: $${mainOption.realValue} - ${discount}% de descuento)`)
      } else if (mainOption.price) {
        contextParts.push(`Precio: $${mainOption.price}`)
      }
      if (mainOption.title) {
        contextParts.push(`Título de la oferta: ${mainOption.title}`)
      }
      if (mainOption.description) {
        contextParts.push(`Descripción: ${mainOption.description}`)
      }
    }
    
    if (formData.whatWeLike) {
      contextParts.push(`Lo que nos gusta: ${formData.whatWeLike.substring(0, 400)}`)
    }
    
    if (formData.aboutOffer) {
      contextParts.push(`Acerca de la oferta: ${formData.aboutOffer.substring(0, 400)}`)
    }
    
    if (formData.goodToKnow) {
      contextParts.push(`Lo que conviene saber: ${formData.goodToKnow.substring(0, 300)}`)
    }

    const userPrompt = `Genera un guion narrativo para un video promocional basado en esta información:

${contextParts.join('\n')}

Crea un guion cálido y atractivo que cuente la historia del negocio y sus ofertas de forma natural.
Asegúrate de incluir TODOS los precios y lo que incluye cada oferta.
Termina siempre con "Compra ahora en ofertasimple.com o en nuestra app."`

    const openai = getOpenAIClient()
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    // Clean up the response
    const script = response.choices[0]?.message?.content?.trim() || ''

    return NextResponse.json({ script })
  } catch (error) {
    logger.error('Error generating video script:', error)
    return NextResponse.json(
      { error: 'Failed to generate video script' },
      { status: 500 }
    )
  }
}

