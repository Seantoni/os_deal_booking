import { NextResponse, NextRequest } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'

interface VideoScriptInput {
  businessName: string
  category?: string | null
  whatWeLike?: string | null
  aboutCompany?: string | null
  aboutOffer?: string | null
  goodToKnow?: string | null
  offerDetails?: string | null
  socialMedia?: string | null
  pricingOptions?: Array<{
    title?: string
    description?: string
    price?: string
    realValue?: string
  }> | null
}

const SYSTEM_PROMPT = `Eres un experto en creación de guiones para videos cortos de marketing en Panamá.
Tu tarea es crear guiones de 15-30 segundos para videos promocionales de ofertas.

ESTRUCTURA DEL GUION:
El guion debe tener este formato claro:

[HOOK - 3 segundos]
(Una frase impactante que capture la atención inmediatamente)

[PROBLEMA/OPORTUNIDAD - 5 segundos]
(Presenta el problema que resuelve o la oportunidad que ofrece)

[SOLUCIÓN/OFERTA - 10 segundos]
(Presenta el negocio y la oferta de manera atractiva)

[PRECIO/BENEFICIO - 5 segundos]
(Destaca el precio, descuento o beneficio principal)

[LLAMADA A ACCIÓN - 5 segundos]
(Indica qué debe hacer el espectador ahora)

REGLAS IMPORTANTES:
1. El guion debe durar entre 15-30 segundos al leerse
2. Usa español panameño natural y atractivo
3. Cada sección debe indicar qué se muestra visualmente [entre corchetes]
4. El tono debe ser energético pero no exagerado
5. Incluye emojis relevantes para indicar énfasis visual
6. El HOOK debe ser irresistible - es lo más importante
7. Mantén las frases cortas y directas
8. Incluye el precio/descuento de forma destacada

FORMATO DE SALIDA:
Devuelve el guion con las secciones claramente marcadas.`

export async function POST(request: NextRequest) {
  try {
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
    
    if (formData.offerDetails) {
      contextParts.push(`Detalles adicionales: ${formData.offerDetails.substring(0, 300)}`)
    }

    const userPrompt = `Genera un guion de video de 15-30 segundos para promocionar esta oferta:

${contextParts.join('\n')}

Crea un guion atractivo y energético que capture la atención desde el primer segundo.`

    const openai = getOpenAIClient()
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 600,
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

