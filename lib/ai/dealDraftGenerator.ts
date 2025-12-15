import { getOpenAIClient } from '@/lib/openai'
import type { DealDraftContent, DealDraftInput } from './dealDraftTypes'

// System prompt for the AI
const SYSTEM_PROMPT = `Eres un agente experto en generar ofertas de descuentos para negocios. Tu trabajo es crear contenido promocional atractivo, persuasivo y profesional en español.

Debes generar el contenido en el siguiente formato estructurado con secciones específicas. Usa un tono promocional, entusiasta y vendedor. Mantén cada sección concisa pero informativa.

REGLAS IMPORTANTES:
1. Siempre genera contenido en español neutro
2. Usa viñetas con asterisco (*) para listas
3. Los encabezados de sección deben estar en MAYÚSCULAS
4. Mantén un tono positivo y vendedor
5. Si falta información, asume valores lógicos basados en el contexto
6. Para enlaces usa "AQUÍ" en mayúsculas
7. Evita errores de ortografía
8. Mantén cada sección breve (2-5 oraciones por párrafo)

SECCIONES REQUERIDAS:

1. LO QUE NOS GUSTA
- Lista de 4-6 puntos destacando beneficios y atractivos
- Enfócate en variedad, ideal para grupos, validez, horarios

2. LA EMPRESA
- Nombre del negocio
- Ubicación: Dirección completa
- Horario: Días y horas (usar L-D para Lunes a Domingo)
- Redes Sociales: Lista de plataformas

3. ACERCA DE ESTA OFERTA
- Descripción del negocio y productos
- Explicación detallada de la oferta
- Variedad de productos/servicios
- Llamada a acción final

4. LO QUE CONVIENE SABER
- INFORMACIÓN GENERAL: Detalles sobre vouchers, impuestos
- RESTRICCIONES: Lista de limitaciones
- RESERVACIONES Y CANCELACIONES: Requisitos y políticas
- MÉTODO DE CANJE: Cómo redimir el voucher
- PERIODO DE VALIDEZ: Fechas, exclusiones

5. PRICE OPTIONS
- Lista de opciones de precio en formato:
  SUCURSAL/OPCIÓN: $Y en productos. $Y $X -Z%

6. BUSINESS NAME
- Nombre completo del negocio

7. DEAL TITLE
- Título principal de la oferta (ej: "Paga $X y consume $Y en [Negocio]")`

// Generate a single section
export async function generateDraftSection(
  sectionName: keyof DealDraftContent,
  input: DealDraftInput
): Promise<string> {
  const openai = getOpenAIClient()
  
  const sectionPrompts: Record<keyof DealDraftContent, string> = {
    loQueNosGusta: `Genera la sección "LO QUE NOS GUSTA" con 4-6 puntos destacando los beneficios y atractivos de esta oferta.`,
    laEmpresa: `Genera la sección "LA EMPRESA" con nombre, ubicación, horario y redes sociales.`,
    acercaDeEstaOferta: `Genera la sección "ACERCA DE ESTA OFERTA" con descripción del negocio, explicación de la oferta y llamada a acción.`,
    loQueConvieneSaber: `Genera la sección "LO QUE CONVIENE SABER" con información general, restricciones, reservaciones, método de canje y periodo de validez.`,
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
  const openai = getOpenAIClient()
  
  const businessInfo = formatBusinessInfo(input)
  
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
  "loQueNosGusta": "contenido de la sección...",
  "laEmpresa": "contenido de la sección...",
  "acercaDeEstaOferta": "contenido de la sección...",
  "loQueConvieneSaber": "contenido de la sección...",
  "priceOptions": "contenido de la sección...",
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
      loQueNosGusta: parsed.loQueNosGusta || '',
      laEmpresa: parsed.laEmpresa || '',
      acercaDeEstaOferta: parsed.acercaDeEstaOferta || '',
      loQueConvieneSaber: parsed.loQueConvieneSaber || '',
      priceOptions: parsed.priceOptions || '',
      businessName: parsed.businessName || '',
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
  lines.push(`Fecha de inicio: ${startDate.toLocaleDateString('es-ES')}`)
  lines.push(`Fecha de fin: ${endDate.toLocaleDateString('es-ES')}`)
  
  // Business details
  if (input.description) {
    lines.push(`Descripción: ${input.description}`)
  }
  if (input.businessReview) {
    lines.push(`Reseña del negocio: ${input.businessReview}`)
  }
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
  
  // Terms & Conditions
  lines.push(`\nTérminos y condiciones:`)
  if (input.redemptionMode) {
    lines.push(`  - Modalidad de canje: ${input.redemptionMode}`)
  }
  if (input.includesTaxes) {
    lines.push(`  - Incluye impuestos: ${input.includesTaxes}`)
  }
  if (input.validOnHolidays) {
    lines.push(`  - Válido en feriados: ${input.validOnHolidays}`)
  }
  if (input.blackoutDates) {
    lines.push(`  - Fechas blackout: ${input.blackoutDates}`)
  }
  if (input.vouchersPerPerson) {
    lines.push(`  - Vouchers por persona: ${input.vouchersPerPerson}`)
  }
  if (input.giftVouchers) {
    lines.push(`  - Vouchers para regalar: ${input.giftVouchers}`)
  }
  if (input.hasOtherBranches) {
    lines.push(`  - Tiene otras sucursales no válidas: ${input.hasOtherBranches}`)
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

