import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'

const RESTAURANT_REVIEW_PROMPT = `Role: You are a contract reviewer specialized in restaurant promotions for e-commerce platforms. Your task is to evaluate if a proposed deal meets success criteria based on industry data and platform performance.

Goal: Ensure the offer is commercially attractive, clearly defined, legally sound, and likely to generate strong sales. Return structured recommendations that can be auto-fixed.

✅ Checklist to Evaluate a Restaurant Deal Contract

Deal Type & Structure
- Is it one of the proven formats? (e.g. 2x1, menu for 2, credit-based voucher, discounted combo).
- Is the price between $3.50 and $25?
- Is the value perception high? (Suggested value ≥ 1.5× price).
- Is the deal not free? Avoid free deals unless part of a larger paid strategy.

Redemption & Terms
- Is the validity period at least 2 weeks?
- Are redemption days and hours clearly stated? (e.g. not valid weekends, holidays, or peak hours).
- Are participating locations clearly listed?
- Is there a limit per user (e.g. max 2 vouchers)?
- Are there exclusion clauses (e.g. "not combinable with other promos")?

Financials
- Check that the margin is reasonable: ideally 30–50%.
- Flag if the cost of goods sold exceeds 60% of the offer price.
- Confirm that taxes, commissions, or service fees are mentioned clearly.

Clarity of Offer Content
- Are all items included in the offer listed with quantities?
- Are modifiers, extras, or choices (e.g. sauce, drink type) clarified?
- Is portion size or product format clear (e.g. "9" pizza", "3 oz scoop")?

Marketing Readiness
- Does the title communicate value in under 12 words?
- Are images, business name, and branding suitable for customer-facing content?
- Are descriptions consistent with the actual service/product?

Legal and Compliance
- Are expiration dates and refund rules included?
- Are force majeure or cancellation clauses covered?
- Is there a clause stating how disputes or customer complaints will be handled?

IMPORTANT: You MUST respond with a valid JSON object in this exact format (no markdown, no extra text):
{
  "isApproved": true/false,
  "summary": "Brief overall assessment in Spanish",
  "recommendations": [
    {
      "id": "unique_id",
      "category": "Precios|Términos|Legal|Contenido|Marketing",
      "issue": "Description of the issue in Spanish",
      "field": "formFieldName or null if not applicable",
      "currentValue": "current value or null",
      "suggestedValue": "suggested fix value or null if manual review needed",
      "canAutoFix": true/false,
      "severity": "error|warning|suggestion"
    }
  ]
}

Available form fields for auto-fix:
- pricingOptions (array with title, description, price, realValue, quantity)
- cancellationPolicy (text)
- addressAndHours (text)
- blackoutDates (text)
- holidaysApply (Sí/No)
- weekendsApply (Sí/No)
- offerDetails (text)
- businessReview (text)
- tipIncluded (Sí/No/Opcional)
- exclusivityCondition (text)

Rules:
- Only set canAutoFix: true if you can provide a specific suggestedValue
- For pricing issues, suggest specific numbers
- For text fields, provide improved text
- Use severity "error" for critical issues, "warning" for important improvements, "suggestion" for nice-to-haves
- Keep suggestions concise and actionable
- All text in Spanish`

export async function POST(req: Request) {
  try {
    // Authentication check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.json()
    
    if (!formData) {
      return NextResponse.json({ error: 'Datos de formulario requeridos' }, { status: 400 })
    }

    // Check if category is restaurant-related
    const parentCategory = (formData.parentCategory || '').toLowerCase()
    const category = (formData.category || '').toLowerCase()
    
    const isRestaurant = 
      parentCategory.includes('restaurante') || 
      parentCategory.includes('restaurant') ||
      category.includes('restaurante') || 
      category.includes('restaurant') ||
      parentCategory.includes('comida') ||
      parentCategory.includes('food')
    
    if (!isRestaurant) {
      return NextResponse.json({ 
        skipped: true, 
        message: 'AI review is currently only available for restaurant categories.' 
      })
    }

    const openai = getOpenAIClient()
    
    // Build a comprehensive summary of the form data for review
    const contractSummary = buildContractSummary(formData)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RESTAURANT_REVIEW_PROMPT },
        { role: 'user', content: `Revisa el siguiente contrato de promoción de restaurante y responde SOLO con JSON válido:\n\n${contractSummary}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    if (!responseText) {
      return NextResponse.json({ error: 'No se pudo generar la revisión.' }, { status: 500 })
    }

    // Parse JSON response
    let reviewData
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        reviewData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      logger.error('Failed to parse AI response as JSON:', responseText)
      // Fallback to legacy text response
      return NextResponse.json({ 
        review: responseText, 
        isApproved: responseText.includes('✅') && !responseText.includes('❌'),
        category: formData.parentCategory || formData.category,
        legacy: true
      })
    }

    return NextResponse.json({ 
      ...reviewData,
      category: formData.parentCategory || formData.category 
    })
  } catch (error) {
    logger.error('AI review-contract error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}

function buildContractSummary(formData: any): string {
  const sections: string[] = []
  
  // Business Info
  sections.push(`## Información del Negocio
- Nombre: ${formData.businessName || 'No especificado'}
- Categoría: ${formData.parentCategory || ''} > ${formData.subCategory1 || ''} > ${formData.subCategory2 || ''} > ${formData.category || ''}
- Email: ${formData.partnerEmail || 'No especificado'}`)

  // Dates & Duration
  sections.push(`## Fechas y Duración
- Fecha de Inicio: ${formData.startDate || 'No especificada'}
- Fecha Final: ${formData.endDate || 'No especificada'}
- Duración de Campaña: ${formData.campaignDuration || 'No especificada'} meses`)

  // Pricing Options
  const pricingOptions = Array.isArray(formData.pricingOptions) ? formData.pricingOptions : []
  if (pricingOptions.length > 0) {
    const pricingSection = pricingOptions.map((opt: any, i: number) => {
      const price = parseFloat(opt.price) || 0
      const realValue = parseFloat(opt.realValue) || 0
      const discount = realValue > 0 ? Math.round(((realValue - price) / realValue) * 100) : 0
      return `  Opción ${i + 1}:
    - Título: ${opt.title || 'Sin título'}
    - Descripción: ${opt.description || 'Sin descripción'}
    - Precio: $${opt.price || '0'}
    - Valor Real: $${opt.realValue || '0'}
    - Descuento: ${discount}%
    - Cantidad disponible: ${opt.quantity || 'Ilimitado'}`
    }).join('\n')
    sections.push(`## Estructura de Precios\n${pricingSection}`)
  }

  // Redemption Details
  sections.push(`## Detalles de Canje
- Modo de Canje: ${formData.redemptionMode || 'No especificado'}
- Contacto para Canje: ${formData.redemptionContactName || 'No especificado'} (${formData.redemptionContactPhone || 'Sin teléfono'})
- Dirección y Horarios: ${formData.addressAndHours || 'No especificado'}`)

  // Restrictions
  sections.push(`## Restricciones y Términos
- Aplica días feriados: ${formData.holidaysApply || 'No especificado'}
- Aplica fines de semana: ${formData.weekendsApply || 'No especificado'}
- Fechas Blackout: ${formData.blackoutDates || 'Ninguna'}
- Exclusividad: ${formData.hasExclusivity || 'No'}
- Condición de Exclusividad: ${formData.exclusivityCondition || 'N/A'}
- Propina incluida: ${formData.tipIncluded || 'No especificado'}`)

  // Description & Content
  sections.push(`## Descripción y Contenido
- Reseña del Negocio: ${formData.businessReview || 'No especificada'}
- Detalles de la Oferta: ${formData.offerDetails || 'No especificados'}
- Redes Sociales: ${formData.socialMedia || 'No especificadas'}`)

  // Policies
  sections.push(`## Políticas
- Política de Cancelación: ${formData.cancellationPolicy || 'No especificada'}
- Validación de Mercado: ${formData.marketValidation || 'No especificada'}`)

  // Additional Comments
  if (formData.additionalComments) {
    sections.push(`## Comentarios Adicionales\n${formData.additionalComments}`)
  }

  return sections.join('\n\n')
}
