import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'

// Types for the content sections
interface BookingContentInput {
  // Basic info
  businessName: string
  partnerEmail: string
  
  // Categories
  parentCategory?: string
  subCategory1?: string
  subCategory2?: string
  
  // Dates
  startDate?: string
  endDate?: string
  
  // Business details
  addressAndHours?: string
  socialMedia?: string
  contactDetails?: string
  
  // Pricing
  pricingOptions?: Array<{
    title: string
    description: string
    price: string
    realValue: string
    quantity: string
  }>
  
  // Terms & Conditions
  redemptionMode?: string
  includesTaxes?: string
  validOnHolidays?: string
  blackoutDates?: string
  vouchersPerPerson?: string
  giftVouchers?: string
  hasOtherBranches?: string
  cancellationPolicy?: string
  
  // Contact
  redemptionContactName?: string
  redemptionContactEmail?: string
  redemptionContactPhone?: string
  redemptionMethods?: string[]
  
  // Additional dynamic fields from InformacionAdicionalStep
  // These are category-specific fields that come from dynamic templates
  [key: string]: unknown
}

interface BookingContentOutput {
  shortTitle: string
  whatWeLike: string
  aboutCompany: string
  aboutOffer: string
  goodToKnow: string
}

// System prompt for the AI
const SYSTEM_PROMPT = `Eres un agente experto en generar ofertas de descuentos para negocios. Tu trabajo es crear contenido promocional atractivo, persuasivo y profesional en español.

REGLAS CRÍTICAS (NUNCA VIOLAR):
1. NUNCA inventes información. SOLO usa la información que se te proporciona explícitamente.
2. Si un campo está vacío, marcado como "No especificado", o no está presente, NO inventes contenido para ese campo.
3. Si falta información esencial (nombre del negocio, ubicación, precios), debes responder con: "No hay información suficiente para generar este contenido. Por favor complete los campos requeridos."
4. NUNCA contradigas los datos proporcionados. Si dice "Válido en feriados: No", NUNCA digas que es válido en feriados.
5. Si una restricción está marcada como "No" o tiene un valor negativo, DEBES mencionarla como restricción, NO como beneficio.
6. Las fechas blackout, restricciones de feriados, y límites de vouchers son RESTRICCIONES que deben aparecer claramente.

REGLAS DE FORMATO:
1. Siempre genera contenido en español neutro
2. Usa viñetas con asterisco (*) para listas
3. Mantén un tono positivo y vendedor, pero SIEMPRE respetando las restricciones
4. SOLO menciona información que esté explícitamente proporcionada. Si no hay información sobre horarios, NO inventes horarios. Si no hay dirección, NO inventes una dirección.
5. Evita errores de ortografía
6. Mantén cada sección breve (2-5 oraciones por párrafo)

LÍMITES DE CARACTERES POR SECCIÓN (RESPETAR ESTRICTAMENTE):
- TÍTULO (shortTitle): Máximo 100 caracteres - Formato: "$PRECIO por DESCRIPCIÓN" (ej: "$14 por Rodizio todo incluido"). NO incluir el nombre del negocio.
- LO QUE NOS GUSTA (whatWeLike): Máximo 800 caracteres
- LA EMPRESA (aboutCompany): Máximo 600 caracteres
- ACERCA DE ESTA OFERTA (aboutOffer): Máximo 1200 caracteres
- LO QUE CONVIENE SABER (goodToKnow): Máximo 1500 caracteres

IMPORTANTE: NO excedas estos límites. Si necesitas incluir información importante, prioriza la más relevante y mantén el contenido conciso.

MANEJO DE RESTRICCIONES:
- "Válido en feriados: No" → Mencionar: "No válido en días feriados"
- "Válido en feriados: Sí" → Puedes mencionar como beneficio: "Válido incluso en feriados"
- "Fechas blackout" → Listar las fechas exactas como restricciones
- "Vouchers por persona" → Mencionar el límite exacto
- "Incluye impuestos: No" → Mencionar: "Impuestos no incluidos" o "ITBMS no incluido"

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
- PERIODO DE VALIDEZ: Fechas exactas y exclusiones`

// Section-specific prompts
const SECTION_PROMPTS: Record<keyof BookingContentOutput, string> = {
  shortTitle: `Genera un título corto y atractivo para la oferta usando el formato "$PRECIO por DESCRIPCIÓN". Usa el precio más bajo de las opciones de precio y una descripción breve de lo que incluye. NO incluyas el nombre del negocio. Ejemplo: "$14 por Rodizio todo incluido" o "$25 por Spa Day con masaje". Máximo 100 caracteres. Solo el título, sin comillas ni explicación. IMPORTANTE: Si no hay información de precios, responde con el mensaje de error.`,
  whatWeLike: `Genera la sección "LO QUE NOS GUSTA" con 4-6 puntos destacando los beneficios y atractivos de esta oferta. Usa viñetas con asterisco (*). Máximo 800 caracteres. No incluyas el encabezado de la sección. IMPORTANTE: Solo menciona beneficios que estén explícitamente en la información proporcionada. NO inventes información.`,
  aboutCompany: `Genera la sección "LA EMPRESA" con nombre, ubicación, horario y redes sociales del negocio. Formato estructurado y claro. Máximo 600 caracteres. No incluyas el encabezado de la sección. IMPORTANTE: Si falta la ubicación o el nombre del negocio, responde con el mensaje de error. NO inventes direcciones o horarios.`,
  aboutOffer: `Genera la sección "ACERCA DE ESTA OFERTA" con descripción del negocio, explicación detallada de la oferta y llamada a acción. Máximo 1200 caracteres. No incluyas el encabezado de la sección. IMPORTANTE: Solo usa información proporcionada. NO inventes descripciones de productos o servicios.`,
  goodToKnow: `Genera la sección "LO QUE CONVIENE SABER" con información general, restricciones, reservaciones, método de canje y periodo de validez. Usa sub-secciones claras. Máximo 1500 caracteres. No incluyas el encabezado de la sección. IMPORTANTE: Solo menciona información que esté explícitamente proporcionada. NO inventes políticas o métodos de canje.`,
}

// Validate required fields before generating content
function validateRequiredFields(input: BookingContentInput): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = []
  
  // Required: Business name
  if (!input.businessName?.trim()) {
    missingFields.push('nombre del negocio')
  }
  
  // Required: Business location/address
  if (!input.addressAndHours?.trim()) {
    missingFields.push('dirección y horario del negocio')
  }
  
  // Required: At least one pricing option with a price (for title generation)
  if (!input.pricingOptions || input.pricingOptions.length === 0) {
    missingFields.push('opciones de precio')
  } else {
    const hasValidPrice = input.pricingOptions.some(opt => opt.price && parseFloat(opt.price) > 0)
    if (!hasValidPrice) {
      missingFields.push('al menos una opción de precio con valor')
    }
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

// Helper to format business info for the prompt
function formatBusinessInfo(input: BookingContentInput): string {
  const lines: string[] = []
  
  // Basic info
  lines.push(`Nombre del negocio: ${input.businessName || 'No especificado'}`)
  lines.push(`Email del negocio: ${input.partnerEmail || 'No especificado'}`)
  
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
  if (input.startDate) {
    const startDate = new Date(input.startDate)
    lines.push(`Fecha de inicio: ${startDate.toLocaleDateString('es-ES', { timeZone: PANAMA_TIMEZONE })}`)
  }
  if (input.endDate) {
    const endDate = new Date(input.endDate)
    lines.push(`Fecha de fin: ${endDate.toLocaleDateString('es-ES', { timeZone: PANAMA_TIMEZONE })}`)
  }
  
  // Business details
  if (input.addressAndHours) {
    lines.push(`Dirección y horario: ${input.addressAndHours}`)
  }
  if (input.socialMedia) {
    lines.push(`Redes sociales: ${input.socialMedia}`)
  }
  if (input.contactDetails) {
    lines.push(`Detalles de contacto: ${input.contactDetails}`)
  }
  
  // Pricing options
  if (input.pricingOptions && input.pricingOptions.length > 0) {
    lines.push(`\nOpciones de precio:`)
    input.pricingOptions.forEach((option, index) => {
      lines.push(`  Opción ${index + 1}:`)
      if (option.title) lines.push(`    - Título: ${option.title}`)
      if (option.description) lines.push(`    - Descripción: ${option.description}`)
      if (option.price) lines.push(`    - Precio: $${option.price}`)
      if (option.realValue) lines.push(`    - Valor real: $${option.realValue}`)
      if (option.quantity) lines.push(`    - Cantidad: ${option.quantity}`)
    })
  }
  
  // Terms & Conditions - Be explicit about restrictions vs permissions
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
    lines.push(`  - ⚠️ FERIADOS: ${input.validOnHolidays} ${holidaysValid ? '(SÍ es válido en feriados - puedes mencionarlo como beneficio)' : '(NO ES VÁLIDO EN FERIADOS - ESTO ES UNA RESTRICCIÓN, NO MENCIONAR COMO BENEFICIO)'}`)
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
  if (input.redemptionMethods && input.redemptionMethods.length > 0) {
    lines.push(`  - Métodos de canje: ${input.redemptionMethods.join(', ')}`)
  }
  
  // Additional dynamic fields from InformacionAdicionalStep
  // These are category-specific fields (e.g., restaurant menu type, spa services, etc.)
  const knownFields = new Set([
    'businessName', 'partnerEmail', 'parentCategory', 'subCategory1', 'subCategory2',
    'startDate', 'endDate', 'addressAndHours', 'socialMedia', 'contactDetails',
    'pricingOptions', 'redemptionMode', 'includesTaxes', 'validOnHolidays', 'blackoutDates',
    'vouchersPerPerson', 'giftVouchers', 'hasOtherBranches', 'cancellationPolicy',
    'redemptionContactName', 'redemptionContactEmail', 'redemptionContactPhone', 'redemptionMethods',
    // Output fields (should not be included as input)
    'whatWeLike', 'aboutCompany', 'aboutOffer', 'goodToKnow',
    // Other form fields that aren't relevant for content generation
    'category', 'merchant', 'additionalEmails', 'opportunityId', 'campaignDuration',
    'isRecurring', 'recurringOfferLink', 'paymentType', 'paymentInstructions',
    'legalName', 'rucDv', 'bankAccountName', 'bank', 'accountNumber', 'accountType',
    'province', 'district', 'corregimiento', 'hasExclusivity', 'exclusivityCondition',
    'commission', 'marketValidation', 'additionalComments', 'dealImages',
    'approverName', 'approverEmail', 'approverBusinessName', 'additionalInfo',
  ])
  
  const additionalFields = Object.entries(input).filter(([key, value]) => 
    !knownFields.has(key) && value != null && value !== ''
  )
  
  if (additionalFields.length > 0) {
    lines.push(`\nInformación adicional específica de la categoría:`)
    additionalFields.forEach(([key, value]) => {
      // Convert camelCase to readable format
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
      lines.push(`  - ${label}: ${String(value)}`)
    })
  }
  
  return lines.join('\n')
}

// Generate a single section
async function generateSection(
  sectionName: keyof BookingContentOutput,
  input: BookingContentInput
): Promise<string> {
  // Validate required fields first
  const validation = validateRequiredFields(input)
  if (!validation.valid) {
    return `No hay información suficiente para generar este contenido. Por favor complete los siguientes campos requeridos: ${validation.missingFields.join(', ')}.`
  }
  
  const openai = getOpenAIClient()
  
  const businessInfo = formatBusinessInfo(input)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { 
        role: 'user', 
        content: `${SECTION_PROMPTS[sectionName]}

INFORMACIÓN DEL NEGOCIO:
${businessInfo}

IMPORTANTE: Si falta información esencial para esta sección, responde con: "No hay información suficiente para generar este contenido. Por favor complete los campos requeridos."

Genera SOLO la sección solicitada.`
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || ''
}

// Generate all sections at once
async function generateAllSections(input: BookingContentInput): Promise<BookingContentOutput> {
  // Validate required fields first
  const validation = validateRequiredFields(input)
  if (!validation.valid) {
    const errorMessage = `No hay información suficiente para generar este contenido. Por favor complete los siguientes campos requeridos: ${validation.missingFields.join(', ')}.`
    return {
      shortTitle: errorMessage,
      whatWeLike: errorMessage,
      aboutCompany: errorMessage,
      aboutOffer: errorMessage,
      goodToKnow: errorMessage,
    }
  }
  
  const openai = getOpenAIClient()
  
  const businessInfo = formatBusinessInfo(input)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { 
        role: 'user', 
        content: `Genera contenido promocional completo basado en la siguiente información del negocio:

${businessInfo}

IMPORTANTE: Si falta información esencial para alguna sección, usa "No hay información suficiente para generar este contenido. Por favor complete los campos requeridos." para esa sección específica.

Responde en formato JSON con las siguientes claves (sin incluir los encabezados de sección en el contenido):
{
  "shortTitle": "título corto formato $PRECIO por DESCRIPCIÓN (máximo 100 caracteres, ej: $14 por Rodizio todo incluido)...",
  "whatWeLike": "contenido de la sección LO QUE NOS GUSTA (máximo 800 caracteres)...",
  "aboutCompany": "contenido de la sección LA EMPRESA (máximo 600 caracteres)...",
  "aboutOffer": "contenido de la sección ACERCA DE ESTA OFERTA (máximo 1200 caracteres)...",
  "goodToKnow": "contenido de la sección LO QUE CONVIENE SABER (máximo 1500 caracteres)..."
}

NOTA SOBRE shortTitle: Usa el PRECIO MÁS BAJO de las opciones de precio disponibles y crea un título atractivo como "$14 por Rodizio todo incluido" o "$25 por Spa Day completo". NO incluyas el nombre del negocio en el título.

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional ni bloques de código.
- NO excedas los límites de caracteres indicados para cada sección.
- NO inventes información. Solo usa la información proporcionada.
- Si falta información importante para una sección, usa el mensaje de error para esa sección específica.`
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content || '{}'
  
  try {
    const parsed = JSON.parse(content) as BookingContentOutput
    return {
      shortTitle: parsed.shortTitle || '',
      whatWeLike: parsed.whatWeLike || '',
      aboutCompany: parsed.aboutCompany || '',
      aboutOffer: parsed.aboutOffer || '',
      goodToKnow: parsed.goodToKnow || '',
    }
  } catch (error) {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse AI-generated content')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { section, formData } = body as { section?: keyof BookingContentOutput; formData: BookingContentInput }
    
    if (!formData.businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }
    
    if (section) {
      // Generate a single section
      const content = await generateSection(section, formData)
      return NextResponse.json({ [section]: content })
    } else {
      // Generate all sections
      const content = await generateAllSections(formData)
      return NextResponse.json(content)
    }
  } catch (error) {
    console.error('Error generating booking content:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

