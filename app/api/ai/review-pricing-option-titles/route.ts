import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { logger } from '@/lib/logger'
import { aiLimiter, applyRateLimit } from '@/lib/rate-limit'

type PricingOptionInput = {
  title?: string
  description?: string
  price?: string
  realValue?: string
}

type TitleReviewItem = {
  index: number
  title: string
  isValid: boolean
  issue: string | null
  suggestedTitle: string | null
}

type TitleReviewResponse = {
  isApproved: boolean
  summary: string
  items: TitleReviewItem[]
}

const TITLE_REVIEW_PROMPT = `Eres un revisor experto de titulos de opciones de compra para ofertas.

Evalua cada titulo con estas reglas:
- Debe ser solo el nombre del producto o servicio.
- Puede incluir detalles utiles como duracion, tamano, color, capacidad, cantidad o presentacion.
- No debe incluir precio, moneda, simbolos monetarios, descuentos ni porcentajes.
- No debe incluir texto comercial o promocional como "Paga", "Compra", "Llevate", "Valor", "Oferta", "Promo".
- No debe incluir nombre del negocio, restricciones, condiciones, llamadas a la accion ni texto legal.
- Debe ser claro, breve y sonar como el nombre real del producto o servicio.

Usa la descripcion y los precios solo como contexto para entender el titulo o sugerir una correccion. No exijas que el precio aparezca en el titulo.

Responde SOLO con JSON valido en este formato:
{
  "isApproved": true,
  "summary": "texto breve en espanol",
  "items": [
    {
      "index": 0,
      "title": "texto original",
      "isValid": true,
      "issue": null,
      "suggestedTitle": null
    }
  ]
}

Reglas de salida:
- Incluye un item por cada titulo recibido.
- Si un titulo cumple, usa isValid=true e issue/suggestedTitle = null.
- Si no cumple, explica el principal problema en issue y propone un suggestedTitle limpio y corto cuando sea posible.
- No inventes detalles que no existan en el titulo o descripcion.
- Todo el texto debe ir en espanol.`

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rateLimitResult = await applyRateLimit(
      aiLimiter,
      userId,
      'Demasiadas solicitudes de IA. Espera un momento antes de generar más contenido.'
    )
    if (rateLimitResult) return rateLimitResult

    const body = await req.json()
    const pricingOptions = Array.isArray(body?.pricingOptions) ? body.pricingOptions : []

    const optionsToReview = pricingOptions
      .map((option: PricingOptionInput, index: number) => ({
        index,
        title: typeof option?.title === 'string' ? option.title.trim() : '',
        description: typeof option?.description === 'string' ? option.description.trim() : '',
        price: typeof option?.price === 'string' ? option.price.trim() : '',
        realValue: typeof option?.realValue === 'string' ? option.realValue.trim() : '',
      }))
      .filter((option) => option.title.length > 0)

    if (optionsToReview.length === 0) {
      return NextResponse.json<TitleReviewResponse>({
        isApproved: true,
        summary: 'No hay titulos para revisar.',
        items: [],
      })
    }

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: TITLE_REVIEW_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            pricingOptions: optionsToReview,
          }, null, 2),
        },
      ],
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    if (!responseText) {
      return NextResponse.json({ error: 'No se pudo revisar los titulos.' }, { status: 500 })
    }

    let parsed: TitleReviewResponse
    try {
      parsed = JSON.parse(responseText) as TitleReviewResponse
    } catch {
      logger.error('Failed to parse pricing title review JSON:', responseText)
      return NextResponse.json({ error: 'No se pudo interpretar la revision de titulos.' }, { status: 500 })
    }

    const items = Array.isArray(parsed?.items)
      ? parsed.items
          .map((item) => ({
            index: typeof item?.index === 'number' ? item.index : -1,
            title: typeof item?.title === 'string' ? item.title : '',
            isValid: Boolean(item?.isValid),
            issue: typeof item?.issue === 'string' && item.issue.trim().length > 0 ? item.issue.trim() : null,
            suggestedTitle: typeof item?.suggestedTitle === 'string' && item.suggestedTitle.trim().length > 0
              ? item.suggestedTitle.trim()
              : null,
          }))
          .filter((item) => item.index >= 0)
      : []

    return NextResponse.json<TitleReviewResponse>({
      isApproved: items.every((item) => item.isValid),
      summary: typeof parsed?.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : items.every((item) => item.isValid)
          ? 'Los titulos cumplen el formato esperado.'
          : 'Algunos titulos deben ajustarse antes de continuar.',
      items,
    })
  } catch (error) {
    logger.error('AI review-pricing-option-titles error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}
