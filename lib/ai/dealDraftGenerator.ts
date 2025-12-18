import { getOpenAIClient } from '@/lib/openai'
import type { DealDraftContent, DealDraftInput } from './dealDraftTypes'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'

// System prompt for the AI
const SYSTEM_PROMPT = `Eres un agente experto en generar ofertas de descuentos para negocios. Tu trabajo es crear contenido promocional atractivo, persuasivo y profesional en español.

Debes generar el contenido en el siguiente formato estructurado con secciones específicas. Usa un tono promocional, entusiasta y vendedor. Mantén cada sección concisa pero informativa.

REGLAS CRÍTICAS (NUNCA VIOLAR):
1. NUNCA contradigas los datos proporcionados. Si dice "Válido en feriados: No", NUNCA digas que es válido en feriados.
2. NUNCA inventes información que contradiga los términos y condiciones proporcionados.
3. Si una restricción está marcada como "No" o tiene un valor negativo, DEBES mencionarla como restricción, NO como beneficio.

REGLAS DE FORMATO:
1. Siempre genera contenido en español neutro
2. Usa viñetas con asterisco (*) para listas
3. Los encabezados de sección deben estar en MAYÚSCULAS
4. Mantén un tono positivo y vendedor, pero SIEMPRE respetando las restricciones
5. Si falta información no crítica, asume valores lógicos
6. Para enlaces usa "AQUÍ" en mayúsculas
7. Evita errores de ortografía
8. Mantén cada sección breve (2-5 oraciones por párrafo)

SECCIONES REQUERIDAS:

1. LO QUE NOS GUSTA (whatWeLike)
- Lista de 4-6 puntos destacando beneficios y atractivos REALES
- Solo mencionar "válido en feriados" SI el dato indica que sí es válido
- Enfócate en variedad, ideal para grupos, horarios

2. LA EMPRESA (aboutCompany)
- Nombre del negocio
- Ubicación: Dirección completa
- Horario: Días y horas (usar L-D para Lunes a Domingo)
- Redes Sociales: Lista de plataformas

3. ACERCA DE ESTA OFERTA (aboutOffer)
- Descripción del negocio y productos
- Explicación detallada de la oferta
- Variedad de productos/servicios
- Llamada a acción final

4. LO QUE CONVIENE SABER (goodToKnow)
- INFORMACIÓN GENERAL: Detalles sobre vouchers, impuestos (respetar si incluye o no)
- RESTRICCIONES: TODAS las limitaciones proporcionadas (feriados, fechas blackout, límites)
- RESERVACIONES Y CANCELACIONES: Requisitos y políticas exactas
- MÉTODO DE CANJE: Cómo redimir el voucher
- PERIODO DE VALIDEZ: Fechas exactas y exclusiones

5. PRICE OPTIONS (priceOptions)
- Lista de opciones de precio en formato:
  SUCURSAL/OPCIÓN: $Y en productos. $Y $X -Z%

6. BUSINESS NAME (businessName)
- Nombre completo del negocio

7. DEAL TITLE (dealTitle)
- Título principal de la oferta (ej: "Paga $X y consume $Y en [Negocio]")`

// Generate a single section
export async function generateDraftSection(
  sectionName: keyof DealDraftContent,
  input: DealDraftInput
): Promise<string> {
  // If pre-filled content exists for this section, return it directly
  const prefilledFields = ['whatWeLike', 'aboutCompany', 'aboutOffer', 'goodToKnow'] as const
  if (prefilledFields.includes(sectionName as any)) {
    const prefilledValue = input[sectionName as keyof DealDraftInput]
    if (prefilledValue && typeof prefilledValue === 'string' && prefilledValue.trim()) {
      return prefilledValue
    }
  }

  const openai = getOpenAIClient()
  
  const sectionPrompts: Record<keyof DealDraftContent, string> = {
    whatWeLike: `Genera la sección "LO QUE NOS GUSTA" con 4-6 puntos destacando los beneficios y atractivos de esta oferta. RESPETA las restricciones proporcionadas.`,
    aboutCompany: `Genera la sección "LA EMPRESA" con nombre, ubicación, horario y redes sociales.`,
    aboutOffer: `Genera la sección "ACERCA DE ESTA OFERTA" con descripción del negocio, explicación de la oferta y llamada a acción.`,
    goodToKnow: `Genera la sección "LO QUE CONVIENE SABER" con información general, restricciones, reservaciones, método de canje y periodo de validez. INCLUYE TODAS las restricciones proporcionadas.`,
    priceOptions: `Genera la sección "PRICE OPTIONS" con las opciones de precio disponibles.`,
    businessName: `Genera la sección "BUSINESS NAME" con el nombre completo del negocio.`,
    dealTitle: `Genera la sección "DEAL TITLE" con un título atractivo para la oferta.`,
  }

  const businessInfo = formatBusinessInfo(input)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { 
        role: 'user', 
        content: `${sectionPrompts[sectionName]}

INFORMACIÓN DEL NEGOCIO:
${businessInfo}

Genera SOLO la sección solicitada, sin incluir el encabezado de la sección.`
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || ''
}

// Generate all sections at once
export async function generateFullDraft(input: DealDraftInput): Promise<DealDraftContent> {
  // Check for pre-filled content from ContenidoStep
  const hasPrefilledWhatWeLike = input.whatWeLike && input.whatWeLike.trim()
  const hasPrefilledAboutCompany = input.aboutCompany && input.aboutCompany.trim()
  const hasPrefilledAboutOffer = input.aboutOffer && input.aboutOffer.trim()
  const hasPrefilledGoodToKnow = input.goodToKnow && input.goodToKnow.trim()
  
  // If all 4 main sections are pre-filled, only generate priceOptions, businessName, and dealTitle
  const allPrefilled = hasPrefilledWhatWeLike && hasPrefilledAboutCompany && hasPrefilledAboutOffer && hasPrefilledGoodToKnow
  
  const openai = getOpenAIClient()
  const businessInfo = formatBusinessInfo(input)
  
  if (allPrefilled) {
    // Only generate the missing sections
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Basándote en la información del negocio, genera SOLO las siguientes secciones:

${businessInfo}

Responde en formato JSON con estas claves:
{
  "priceOptions": "opciones de precio formateadas",
  "businessName": "nombre del negocio",
  "dealTitle": "título atractivo de la oferta"
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional ni bloques de código.`
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'
    
    try {
      const parsed = JSON.parse(content)
      return {
        whatWeLike: input.whatWeLike || '',
        aboutCompany: input.aboutCompany || '',
        aboutOffer: input.aboutOffer || '',
        goodToKnow: input.goodToKnow || '',
        priceOptions: parsed.priceOptions || '',
        businessName: parsed.businessName || input.name || '',
        dealTitle: parsed.dealTitle || '',
      }
    } catch (error) {
      console.error('Failed to parse AI response:', content)
      throw new Error('Failed to parse AI-generated draft')
    }
  }
  
  // Generate all sections (some may be pre-filled)
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { 
        role: 'user', 
        content: `Genera una oferta completa basada en la siguiente información del negocio:

${businessInfo}

Responde en formato JSON con las siguientes claves (sin incluir los encabezados de sección en el contenido):
{
  "whatWeLike": "contenido de LO QUE NOS GUSTA...",
  "aboutCompany": "contenido de LA EMPRESA...",
  "aboutOffer": "contenido de ACERCA DE ESTA OFERTA...",
  "goodToKnow": "contenido de LO QUE CONVIENE SABER...",
  "priceOptions": "contenido de PRICE OPTIONS...",
  "businessName": "nombre del negocio",
  "dealTitle": "título de la oferta"
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional ni bloques de código.`
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content || '{}'
  
  try {
    const parsed = JSON.parse(content) as DealDraftContent
    return {
      // Use pre-filled values if available, otherwise use AI-generated
      whatWeLike: hasPrefilledWhatWeLike ? input.whatWeLike! : (parsed.whatWeLike || ''),
      aboutCompany: hasPrefilledAboutCompany ? input.aboutCompany! : (parsed.aboutCompany || ''),
      aboutOffer: hasPrefilledAboutOffer ? input.aboutOffer! : (parsed.aboutOffer || ''),
      goodToKnow: hasPrefilledGoodToKnow ? input.goodToKnow! : (parsed.goodToKnow || ''),
      priceOptions: parsed.priceOptions || '',
      businessName: parsed.businessName || input.name || '',
      dealTitle: parsed.dealTitle || '',
    }
  } catch (error) {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse AI-generated draft')
  }
}

// Helper to format business info for the prompt
function formatBusinessInfo(input: DealDraftInput): string {
  const lines: string[] = []
  
  // Basic info
  lines.push(`Nombre del negocio: ${input.name || input.merchant || 'No especificado'}`)
  lines.push(`Email del negocio: ${input.businessEmail}`)
  
  // Categories
  if (input.parentCategory) {
    lines.push(`Categoría: ${input.parentCategory}`)
  }
  if (input.subCategory1) {
    lines.push(`Subcategoría: ${input.subCategory1}`)
  }
  if (input.subCategory2) {
    lines.push(`Subcategoría 2: ${input.subCategory2}`)
  }
  
  // Dates
  const startDate = typeof input.startDate === 'string' ? new Date(input.startDate) : input.startDate
  const endDate = typeof input.endDate === 'string' ? new Date(input.endDate) : input.endDate
  lines.push(`Fecha de inicio: ${startDate.toLocaleDateString('es-ES', { timeZone: PANAMA_TIMEZONE })}`)
  lines.push(`Fecha de fin: ${endDate.toLocaleDateString('es-ES', { timeZone: PANAMA_TIMEZONE })}`)
  
  // Business details
  if (input.offerDetails) {
    lines.push(`Detalles de la oferta: ${input.offerDetails}`)
  }
  if (input.addressAndHours) {
    lines.push(`Dirección y horario: ${input.addressAndHours}`)
  }
  if (input.socialMedia) {
    lines.push(`Redes sociales: ${input.socialMedia}`)
  }
  
  // Pricing options
  if (input.pricingOptions && Array.isArray(input.pricingOptions) && input.pricingOptions.length > 0) {
    lines.push(`\nOpciones de precio:`)
    input.pricingOptions.forEach((option: any, index: number) => {
      lines.push(`  Opción ${index + 1}:`)
      if (option.title) lines.push(`    - Título: ${option.title}`)
      if (option.description) lines.push(`    - Descripción: ${option.description}`)
      if (option.price) lines.push(`    - Precio: $${option.price}`)
      if (option.realValue) lines.push(`    - Valor real: $${option.realValue}`)
      if (option.quantity) lines.push(`    - Cantidad: ${option.quantity}`)
    })
  }
  
  // Terms & Conditions - Be explicit about restrictions
  lines.push(`\nTérminos y condiciones (RESPETAR EXACTAMENTE):`)
  if (input.redemptionMode) {
    lines.push(`  - Modalidad de canje: ${input.redemptionMode}`)
  }
  if (input.includesTaxes) {
    const taxesIncluded = input.includesTaxes.toLowerCase() === 'sí' || input.includesTaxes.toLowerCase() === 'si' || input.includesTaxes.toLowerCase() === 'yes'
    lines.push(`  - Incluye impuestos: ${input.includesTaxes} ${taxesIncluded ? '(SÍ incluye ITBMS)' : '(NO incluye ITBMS - el cliente debe pagar impuestos adicionales)'}`)
  }
  if (input.validOnHolidays) {
    const holidaysValid = input.validOnHolidays.toLowerCase() === 'sí' || input.validOnHolidays.toLowerCase() === 'si' || input.validOnHolidays.toLowerCase() === 'yes'
    lines.push(`  - ⚠️ FERIADOS: ${input.validOnHolidays} ${holidaysValid ? '(SÍ es válido en feriados)' : '(NO ES VÁLIDO EN FERIADOS - RESTRICCIÓN)'}`)
  }
  if (input.blackoutDates) {
    lines.push(`  - ⚠️ FECHAS BLACKOUT (NO VÁLIDO): ${input.blackoutDates}`)
  }
  if (input.vouchersPerPerson) {
    lines.push(`  - Límite de vouchers por persona: ${input.vouchersPerPerson}`)
  }
  if (input.giftVouchers) {
    const canGift = input.giftVouchers.toLowerCase() === 'sí' || input.giftVouchers.toLowerCase() === 'si' || input.giftVouchers.toLowerCase() === 'yes'
    lines.push(`  - Vouchers para regalar: ${input.giftVouchers} ${canGift ? '(SÍ se puede regalar)' : '(NO se puede regalar)'}`)
  }
  if (input.hasOtherBranches) {
    const hasOthers = input.hasOtherBranches.toLowerCase() === 'sí' || input.hasOtherBranches.toLowerCase() === 'si' || input.hasOtherBranches.toLowerCase() === 'yes'
    lines.push(`  - Otras sucursales: ${input.hasOtherBranches} ${hasOthers ? '(HAY otras sucursales donde NO es válido - RESTRICCIÓN)' : '(No hay otras sucursales)'}`)
  }
  if (input.cancellationPolicy) {
    lines.push(`  - Política de cancelación: ${input.cancellationPolicy}`)
  }
  
  // Contact
  if (input.redemptionContactName || input.redemptionContactEmail || input.redemptionContactPhone) {
    lines.push(`\nContacto de canje:`)
    if (input.redemptionContactName) {
      lines.push(`  - Nombre: ${input.redemptionContactName}`)
    }
    if (input.redemptionContactEmail) {
      lines.push(`  - Email: ${input.redemptionContactEmail}`)
    }
    if (input.redemptionContactPhone) {
      lines.push(`  - Teléfono: ${input.redemptionContactPhone}`)
    }
  }
  if (input.contactDetails) {
    lines.push(`  - Detalles de contacto: ${input.contactDetails}`)
  }
  if (input.redemptionMethods && Array.isArray(input.redemptionMethods) && input.redemptionMethods.length > 0) {
    lines.push(`  - Métodos de canje: ${input.redemptionMethods.join(', ')}`)
  }
  
  return lines.join('\n')
}
