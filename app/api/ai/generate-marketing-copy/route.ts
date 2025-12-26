import { NextResponse, NextRequest } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'

interface MarketingCopyInput {
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

const SYSTEM_PROMPT = `Eres un experto en marketing digital y redacción publicitaria para redes sociales en Panamá.
Tu tarea es crear un copy atractivo y conciso para promocionar ofertas en redes sociales.

REGLAS IMPORTANTES:
1. El copy debe ser CORTO y ATRACTIVO - máximo 280 caracteres (ideal para redes sociales)
2. NO incluyas hashtags
3. Usa español panameño natural y atractivo
4. Enfócate en el beneficio principal para el cliente
5. Incluye el precio o descuento si es relevante
6. Crea urgencia o deseo sin ser agresivo
7. El tono debe ser amigable y cercano
8. Debe funcionar para Instagram, TikTok y otras plataformas

FORMATO DE SALIDA:
Devuelve SOLO el copy, sin explicaciones ni formato adicional.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formData } = body as { formData: MarketingCopyInput }

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
        contextParts.push(`Precio: $${mainOption.price} (Valor real: $${mainOption.realValue} - ${discount}% OFF)`)
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
      contextParts.push(`Lo que nos gusta: ${formData.whatWeLike.substring(0, 300)}`)
    }
    
    if (formData.aboutOffer) {
      contextParts.push(`Acerca de la oferta: ${formData.aboutOffer.substring(0, 300)}`)
    }
    

    const userPrompt = `Genera un copy atractivo para redes sociales basado en esta información:

${contextParts.join('\n')}

Recuerda: máximo 280 caracteres, sin hashtags, corto y atractivo.`

    const openai = getOpenAIClient()
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 200,
    })

    // Clean up the response
    const copy = response.choices[0]?.message?.content?.trim() || ''

    return NextResponse.json({ copy })
  } catch (error) {
    logger.error('Error generating marketing copy:', error)
    return NextResponse.json(
      { error: 'Failed to generate marketing copy' },
      { status: 500 }
    )
  }
}
