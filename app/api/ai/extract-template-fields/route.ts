import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { aiLimiter, applyRateLimit, getClientIp } from '@/lib/rate-limit'

interface FieldDefinition {
  name: string
  label: string
  type: string
  options?: readonly { value: string; label: string }[]
}

interface ExtractRequest {
  textContent: {
    aboutOffer?: string
    goodToKnow?: string
    whatWeLike?: string
    howToUseEs?: string
    businessReview?: string
    addressAndHours?: string
    paymentInstructions?: string
  }
  fields: FieldDefinition[]
  templateName: string
}

function buildPrompt(textContent: ExtractRequest['textContent'], fields: FieldDefinition[]): string {
  const textParts: string[] = []

  if (textContent.aboutOffer) textParts.push(`ACERCA DE LA OFERTA:\n${textContent.aboutOffer}`)
  if (textContent.goodToKnow) textParts.push(`LO QUE CONVIENE SABER:\n${textContent.goodToKnow}`)
  if (textContent.whatWeLike) textParts.push(`LO QUE NOS GUSTA:\n${textContent.whatWeLike}`)
  if (textContent.howToUseEs) textParts.push(`CÓMO USAR:\n${textContent.howToUseEs}`)
  if (textContent.businessReview) textParts.push(`RESEÑA DEL NEGOCIO:\n${textContent.businessReview}`)
  if (textContent.addressAndHours) textParts.push(`DIRECCIÓN Y HORARIOS:\n${textContent.addressAndHours}`)
  if (textContent.paymentInstructions) textParts.push(`DETALLES DE PAGO:\n${textContent.paymentInstructions}`)

  const fieldDescriptions = fields.map(f => {
    let desc = `- "${f.name}": ${f.label}`
    if (f.options && f.options.length > 0) {
      const validValues = f.options.map(o => o.value).join(', ')
      desc += ` (VALORES PERMITIDOS: ${validValues})`
    }
    return desc
  }).join('\n')

  return `Analiza el siguiente texto de una oferta existente y extrae los valores para los campos indicados.

TEXTO DE LA OFERTA:
${textParts.join('\n\n')}

CAMPOS A EXTRAER:
${fieldDescriptions}

REGLAS:
1. SOLO extrae información que esté EXPLÍCITAMENTE mencionada en el texto.
2. Si un campo tiene VALORES PERMITIDOS, DEBES usar uno de esos valores exactos. No inventes valores propios.
3. Para campos Sí/No, responde "Sí" o "No" solo si la información está clara en el texto.
4. Si no encuentras información para un campo, NO lo incluyas en la respuesta.
5. NO inventes ni asumas información que no esté en el texto.
6. Responde SOLO con JSON válido, sin texto adicional.

Responde con un objeto JSON donde las claves son los nombres de campo y los valores son los datos extraídos.`
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const identifier = userId || getClientIp(request)
    const rateLimitResult = await applyRateLimit(
      aiLimiter,
      identifier,
      'Demasiadas solicitudes de IA. Espera un momento.'
    )
    if (rateLimitResult) return rateLimitResult

    const body = (await request.json()) as ExtractRequest

    if (!body.fields || body.fields.length === 0) {
      return NextResponse.json({ error: 'No fields to extract' }, { status: 400 })
    }

    const hasText = Object.values(body.textContent || {}).some(v => v && v.trim())
    if (!hasText) {
      return NextResponse.json({ error: 'No text content to analyze' }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const prompt = buildPrompt(body.textContent, body.fields)

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en analizar textos de ofertas promocionales en español (Panamá) y extraer datos estructurados. Respondes SOLO con JSON válido.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'

    try {
      const extracted = JSON.parse(content) as Record<string, string>

      // Filter: only keep fields that were requested and have valid values
      const validFieldNames = new Set(body.fields.map(f => f.name))
      const filtered: Record<string, string> = {}
      for (const [key, value] of Object.entries(extracted)) {
        if (!validFieldNames.has(key) || !value || typeof value !== 'string') continue

        const fieldDef = body.fields.find(f => f.name === key)
        if (fieldDef?.options && fieldDef.options.length > 0) {
          const validValues = fieldDef.options.map(o => o.value)
          if (!validValues.includes(value)) continue
        }

        filtered[key] = value
      }

      return NextResponse.json({
        success: true,
        extracted: filtered,
        fieldsFound: Object.keys(filtered).length,
        fieldsTotal: body.fields.length,
      })
    } catch {
      console.error('[extract-template-fields] Failed to parse AI response:', content)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }
  } catch (error) {
    console.error('[extract-template-fields] Error:', error)
    return NextResponse.json({ error: 'Failed to extract fields' }, { status: 500 })
  }
}
