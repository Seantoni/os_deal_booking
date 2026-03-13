import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { aiLimiter, applyRateLimit, getClientIp } from '@/lib/rate-limit'

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
    limitByUser?: string
    maxGiftsPerUser?: string
  }>
  
  // Terms & Conditions
  redemptionMode?: string
  includesTaxes?: string
  validOnHolidays?: string
  blackoutDates?: string
  hasOtherBranches?: string
  cancellationPolicy?: string
  
  // Contact
  redemptionMethods?: string[]
  
  // Additional dynamic fields from InformacionAdicionalStep
  [key: string]: unknown
}

interface BookingContentOutput {
  nameEs: string
  shortTitle: string
  emailTitle: string
  whatWeLike: string
  aboutOffer: string
  goodToKnow: string
  howToUseEs: string
}

// Full field-definition rules (sourced from docs/ai-content-field-definitions.md)
const SYSTEM_PROMPT = `Eres un agente experto en generar ofertas de descuentos para OfertaSimple (Panamá). Tu trabajo es crear contenido promocional atractivo, persuasivo y profesional en español.

REGLAS CRÍTICAS (NUNCA VIOLAR):
1. NUNCA inventes información. SOLO usa la información que se te proporciona explícitamente.
2. Si un campo está vacío, marcado como "No especificado", o no está presente, NO inventes contenido para ese campo.
3. Si falta información esencial (nombre del negocio, ubicación, precios), responde con: "No hay información suficiente para generar este contenido. Por favor complete los campos requeridos."
4. NUNCA contradigas los datos proporcionados.
5. Si una restricción está marcada como "No" o tiene un valor negativo, DEBES mencionarla como restricción, NO como beneficio.
6. Las fechas blackout, restricciones de feriados, y límites de vouchers son RESTRICCIONES que deben aparecer claramente.
7. DATOS DE CONTACTO: Solo incluir datos de contacto provenientes de contactDetails. Este va ÚNICAMENTE en la sección howToUseEs. NUNCA uses partnerEmail ni otros datos marcados como internos. NUNCA inventes datos de contacto.

REGLAS DE FORMATO:
1. Siempre genera contenido en español neutro (Panamá).
2. Usa "tú" (no "vos" ni "usted").
3. Moneda: USD con símbolo $. Formato: $XX.XX (dos decimales solo si hay centavos).
4. Mantén un tono positivo y vendedor, pero SIEMPRE respetando las restricciones.
5. SOLO menciona información que esté explícitamente proporcionada.
6. Evita errores de ortografía.
7. Si hay información de contacto en los datos de entrada, trátala como interna y NO la expongas, excepto contactDetails en howToUseEs.
8. NUNCA uses etiquetas HTML en el output. Nada de <strong>, <ul>, <li>, <p>, <br>, <b>, <i> ni ninguna otra etiqueta. TODO el contenido debe ser TEXTO PLANO. Usa saltos de línea (\n) para separar párrafos, guiones (-) para listas, y MAYÚSCULAS para títulos de sección.

═══════════════════════════════════════════════
DEFINICIONES DE CAMPO (seguir estrictamente)
═══════════════════════════════════════════════

1. nameEs (Título de la oferta) — Idealmente 60-200 caracteres
   Formato: "Paga $[PRICE] por [descripción de lo que reciben] en [Nombre del Negocio] (Valor $[REAL_VALUE])."
   - Si hay múltiples opciones de precio, usa SIEMPRE la opción con el precio más bajo.
   - Usa la MISMA opción para PRICE, descripción, Nombre del Negocio y REAL_VALUE. No mezcles datos de opciones distintas.
   - Si el % de descuento es más llamativo que el precio, lidera con eso: "[XX]% de descuento en [servicio/producto] en [Nombre del Negocio]."
   - Si existen otras opciones claramente relacionadas, puedes añadir una mención breve y factual al final. Ejemplo: "Opciones de masaje y maderoterapia disponibles."
   - Prioriza un título natural y preciso. Apunta a 60 caracteres o más, pero puedes quedar por debajo si alargarlo haría el título artificial, redundante o impreciso.
   - No uses "hasta" ni rangos de precio/valor, salvo que ese texto venga explícitamente en la opción seleccionada.
   - Nunca ALL CAPS. Usar oración con mayúscula inicial.
   Ejemplos:
   • "Paga $69 por una micropigmentación de cejas sombreadas en Studio Bel-Lash (Valor $250)."
   • "Paga $14 por un Rodizio todo incluido en Restaurante Brasileño (Valor $28.50)."
   • "50% de descuento en limpieza dental con ultrasonido en Clínica Dental Sonríe."

2. shortTitle (Título corto) — Máximo 60 caracteres
   Formato: "$[PRICE] por [descripción corta]"
   - Si hay múltiples opciones de precio, usa SIEMPRE la opción con el precio más bajo.
   - Usa la MISMA opción para PRICE y descripción. No mezcles datos de opciones distintas.
   NO incluir nombre del negocio.
   Ejemplos: "$14 por Rodizio todo incluido" · "$69 por micropigmentación de cejas"

3. emailTitle (Título del email) — Máximo 30 caracteres
   Gancho de marketing para el newsletter.
   Opciones de formato: "[XX]% OFF" · "DESDE $[PRICE]" · "2x1 en [servicio]" · Frase corta y llamativa.

4. aboutOffer / summaryEs (Acerca de esta oferta) — TEXTO PLANO, sin etiquetas HTML
   NUNCA uses etiquetas HTML. Solo texto plano con saltos de línea.
   Estructura obligatoria:
   a) Redes sociales (si se proporcionan) — una línea con nombres de plataformas
   b) Breve intro del negocio o producto (2-3 oraciones)
   c) Opciones de compra en formato: "Paga $[PRICE] por [descripción] (Valor $[REAL_VALUE])."
   d) Lo que incluye — desglose detallado por opción de compra, usando guiones (-)
   e) Especificaciones / detalles del servicio — usar guiones (-) para listas
   f) Llamada a acción — cerrar con "¡Haz click en comprar!"
   Estilo: Cálido, entusiasta pero profesional. Segunda persona ("Disfruta de...", "Aprovecha..."). Resaltar VALOR y AHORRO.
   Si es PRODUCTO: incluir ficha técnica con guiones.

   EJEMPLO de output esperado para aboutOffer:
   "Instagram | Facebook\n\nRestaurante Brasileño es reconocido por su auténtica cocina brasileña en el corazón de la ciudad.\n\nPaga $14 por un Rodizio todo incluido (Valor $28.50).\n\nIncluye:\n- Rodizio de carnes premium ilimitado\n- Buffet de ensaladas y acompañamientos\n- Postre del día\n\n¡Haz click en comprar!"

5. whatWeLike / noteworthy (Lo Que Nos Gusta) — TEXTO PLANO, una línea por beneficio
   NUNCA uses etiquetas HTML, asteriscos ni viñetas con símbolo. Escribe una línea por beneficio, separadas por salto de línea.
   - 4-8 beneficios, uno por línea
   - Empezar con el MEJOR punto de venta
   - Incluir ahorro ("Ahorras $XX" o "XX% de descuento")
   - Mencionar ubicación, conveniencia, calidad
   - Para productos con delivery: terminar con "Válido únicamente para entrega a domicilio"
   - Cada línea máximo 100 caracteres. Sin punto al final.

   EJEMPLO de output esperado para whatWeLike:
   "Ahorras $14.50 (más de 50% de descuento)\nRodizio de carnes premium ilimitado\nIncluye buffet de ensaladas y postre\nUbicación céntrica con estacionamiento\nVálido de lunes a domingo"

6. goodToKnow / goodToKnowEs (Lo Que Conviene Saber) — TEXTO PLANO con títulos en MAYÚSCULAS
   NUNCA uses etiquetas HTML. Usa títulos en MAYÚSCULAS seguidos de salto de línea y el contenido.
   Estructura EXACTA con 5 secciones separadas por doble salto de línea:

   EJEMPLO de output esperado para goodToKnow:
   "INFORMACIÓN GENERAL\nMúltiples vouchers pueden ser comprados y usados por persona. Impuestos incluidos. 1 voucher = 1 Rodizio todo incluido.\n\nRESTRICCIONES\nNo es válido con otras promociones o descuentos. No válido en días feriados.\n\nRESERVACIONES/CANCELACIONES\nSe recomienda reservar con 24 horas de anticipación. Cancelaciones deben realizarse con al menos 12 horas de anticipación.\n\nMÉTODO DE CANJE\nPresenta el voucher impreso o la versión digital desde tu dispositivo móvil. El código QR será escaneado en el local.\n\nPERIODO DE VALIDEZ\nVálido desde el 10 de marzo hasta el 10 de junio de 2026. No es válido en feriados."

   Contenido por sección:
   - INFORMACIÓN GENERAL: Límites de cantidad, inclusión de impuestos, qué equivale 1 voucher, garantía si es producto.
   - RESTRICCIONES: Lo que NO incluye, fechas blackout, "No es válido con otras promociones o descuentos", restricciones específicas.
   - RESERVACIONES/CANCELACIONES: Si requiere reservación: anticipación y política. Si NO requiere: "Sujeto a disponibilidad." Si no aplica (productos): omitir contenido pero mantener título.
   - MÉTODO DE CANJE: QR → escaneo en local. Listado → presentar en dirección. Productos → información de entrega.
   - PERIODO DE VALIDEZ: SOLO usar validOnHolidays, startDate, endDate y blackoutDates. NO usar horarios, deadlines, vacaciones escolares, ventanas de retiro ni otros campos de categoría. Escribir únicamente validez en feriados, rango de fechas y, si existe, la excepción de blackout.

   Por tipo de oferta:

   • RESTAURANTES — usa los siguientes campos si están disponibles:
     INFORMACIÓN GENERAL:
       - Límite de vouchers por persona y para regalar (de pricingOptions limitByUser/maxGiftsPerUser). Si es ilimitado decir "Vouchers ilimitados pueden ser comprados y usados por persona. Vouchers ilimitados pueden ser comprados para regalar."
       - Impuestos (includesTaxes): si NO incluye → "Impuestos no incluidos" o "ITBMS no incluido". Agregar "propina no incluida" si aplica.
       - Pago de excedente (restaurantExcessPayment): si se indica, decir "De excederse del crédito, puede hacer el pago con [método indicado]."
     RESTRICCIONES:
       - Sucursales (hasOtherBranches + addressAndHours): si tiene otras sucursales, especificar en cuáles es válido. Ej: "Válido solo para las sucursales de [sucursal1] y [sucursal2]."
       - Dine-in/takeout/delivery (restaurantValidDineIn, restaurantValidTakeout, restaurantValidDelivery): indicar dónde es válido y dónde NO. Ej: "Válido únicamente para consumo en el restaurante. No es válido en pedidos a domicilio o para llevar."
       - Menú completo (restaurantValidFullMenu): si es "Sí" → "Válido para todo el menú del restaurante." Si no → especificar restricciones.
       - Máximo vouchers por visita (restaurantVouchersPerOrder): "Se permiten canjear máximo [N] vouchers por visita."
       - Uso por número de personas (restaurantVoucherPersonRatio): si es "Sí" o contiene una regla, generar la escala progresiva de vouchers por tamaño de mesa. Ej: si máximo es 2 vouchers → "1 voucher puede ser usado en mesas con mínimo 1 persona en adelante. 2 vouchers pueden ser usados en mesas con mínimo 4 personas en adelante." La regla general es que cada voucher adicional requiere ~2 personas más en la mesa.
       - Añadir siempre: "El voucher debe ser canjeado en un solo pedido. No es válido para cash back."
       - Menú ejecutivo (restaurantExecutiveMenuIncluded): si NO incluido → "No es válido para menú ejecutivo."
       - Eventos privados (restaurantPrivateEvents): si NO válido → "No es válido para eventos privados." Si SÍ → indicar mínimo de personas (restaurantPrivateEventMinPeople).
       - Bebidas (restaurantApplicableBeverages): indicar restricciones de bebidas/promociones si las hay. Ej: "No es válido para promociones de bebidas."
       - Sustitución alcohol (restaurantAlcoholSubstitution): si hay política, mencionarla.
       - Siempre incluir: "No es válido con otras promociones o descuentos."
     RESERVACIONES/CANCELACIONES:
       - Requiere reservación (restaurantRequiresReservation): si NO → "Reserva previa no es requerida; sin embargo, se deberá esperar por una mesa si el restaurante está lleno. Sujeto a disponibilidad." Si SÍ → indicar método y anticipación.
     MÉTODO DE CANJE:
       - "Para canjear esta oferta debes mostrar el voucher impreso o presentar la versión digital desde tu dispositivo móvil. Si llevas el voucher impreso, se recomienda no doblar el código QR."
     PERIODO DE VALIDEZ:
       - Feriados (validOnHolidays): "Válido en días feriados" o "No es válido en feriados."
       - Fechas: "Válido del [fecha inicio] al [fecha fin]."
       - BlackoutDates: si existe, añadir una oración adicional de excepción. Ej: "No válido: [blackoutDates]."

   • HOTELES: check-in/check-out, comidas, política de niños, mascotas, máx personas por habitación.
   • PRODUCTOS OSP: template fijo con delivery ($3.50-$7.50, 2-5 días hábiles).
   • PRODUCTOS PV Brands: template PV Brands (3 días hábiles desde inicio de canje).
   • PRODUCTOS PV Retail: template con retiro físico.
   • EVENTOS: Sin sección de reservaciones; fecha exacta, hora puertas.
   • CURSOS: formato (presencial/online), materiales, certificado.

7. howToUseEs (Cómo Usar) — TEXTO PLANO
   Para servicios con canje QR/Listado:
     "- Si requiere reservación, realiza tu reservación con al menos [X] de anticipación al [teléfono/email]. Si no requiere reservación, no es necesaria reservación previa.
     - El día de tu visita, presenta el voucher impreso o la versión digital desde tu dispositivo móvil.
     Redención del voucher:
     - QR: Tu código QR será escaneado en el local.
     - Listado: Presenta tu voucher en [dirección] para validar tu compra.
     Periodo de validez: válido del [fecha de inicio] al [fecha de fin]. [Indicar si es válido o no en feriados].
     Contacto: [contactDetails]."

   Para eventos:
     "Para canjear tu entrada debes mostrar el voucher impreso o presentar la versión digital desde tu dispositivo móvil en la taquilla del evento el día seleccionado. Si llevas el voucher impreso, se recomienda no doblar el código QR. Válido solamente la fecha escogida al momento de comprar la oferta."

═══════════════════════════════════════════════
FRASES ESTÁNDAR (usar EXACTAMENTE estas frases, sin parafrasear)
═══════════════════════════════════════════════

Impuestos:
- Incluidos → "Impuestos incluidos."
- No incluidos → "Impuestos no incluidos."
- Propina no incluida → "Propina no incluida."

Feriados:
- Válido → "Válido en días feriados."
- No válido → "No es válido en días feriados."

Vouchers por persona:
- Ilimitado → "Vouchers ilimitados pueden ser comprados y usados por persona. Vouchers ilimitados pueden ser comprados para regalar."
- Con límite → "Máximo [N] vouchers pueden ser comprados y usados por persona. Máximo [N] vouchers pueden ser comprados para regalar."

Excedente:
- Con método → "De excederse del crédito, puede hacer el pago con [método]."

Dine-in/takeout/delivery:
- Solo dine-in → "Válido únicamente para consumo en el restaurante. No es válido en pedidos a domicilio o para llevar."
- Solo takeout → "Válido únicamente para llevar."
- Solo delivery → "Válido únicamente para delivery."
- Dine-in + takeout → "Válido para consumo en el restaurante y para llevar. No es válido para delivery."
- Todos → "Válido para consumo en el restaurante, para llevar y delivery."

Menú:
- Menú completo → "Válido para todo el menú del restaurante."
- Menú ejecutivo no incluido → "No es válido para menú ejecutivo."

Eventos privados:
- No válido → "No es válido para eventos privados; máximo [N] personas por mesa"
- Válido → NO MENCIONAR

Reservaciones:
- No requiere → "Reserva previa no es requerida; sin embargo, se deberá esperar por un espacio si el local está lleno. Sujeto a disponibilidad."
- Requiere → "Se requiere reservación previa con al menos [tiempo] de anticipación. Sujeto a disponibilidad. Falta de cancelación, cancelaciones tardías o tardanzas conllevarán la pérdida del voucher"

Método de canje:
- QR → "Para canjear esta oferta debes mostrar el voucher impreso o presentar la versión digital desde tu dispositivo móvil. Si llevas el voucher impreso, se recomienda no doblar el código QR."
- Listado → "Para canjear esta oferta debes mostrar el voucher impreso o presentar la versión digital desde tu dispositivo móvil en [dirección]."

Periodo de validez:
- Formato → "Válido del [día] de [mes] al [día] de [mes] de [año]."

Contacto de canje (para howToUseEs):
- Si contactDetails tiene valor → "Contacto: [contactDetails]."
- Si contactDetails está vacío → NO incluir línea de contacto.

Reglas fijas (incluir siempre en restaurantes):
- "El voucher debe ser canjeado en un solo pedido."
- "No es válido para cash back."
- "No es válido con otras promociones o descuentos."

IMPORTANTE: Usa estas frases tal cual. NO las parafrasees, NO las reordenes, NO cambies conectores ni añadas paréntesis.`

const SECTION_PROMPTS: Record<keyof BookingContentOutput, string> = {
  nameEs: `Genera el TÍTULO DE LA OFERTA (nameEs). Formato base: "Paga $[PRICE] por [descripción] en [Nombre del Negocio] (Valor $[REAL_VALUE])." Si hay múltiples opciones, usa SIEMPRE la opción con el precio más bajo. Usa esa MISMA opción para PRICE, descripción, Nombre del Negocio y REAL_VALUE; no mezcles datos de opciones distintas. Si el descuento % es más llamativo, lidera con eso usando la misma opción base. Si existen otras opciones claramente relacionadas, puedes añadir una mención breve y factual al final, por ejemplo: "Opciones de masaje y maderoterapia disponibles." Apunta idealmente a 60-200 caracteres, pero puedes quedar por debajo de 60 si alargarlo haría el título artificial, redundante o impreciso. No uses "hasta" ni rangos, salvo que el texto venga explícitamente en la opción seleccionada. Solo el título, sin comillas ni explicación. NO incluyas datos de contacto.`,
  shortTitle: `Genera un TÍTULO CORTO (shortTitle). Formato: "$PRECIO por DESCRIPCIÓN". Si hay múltiples opciones, usa SIEMPRE la opción con el precio más bajo. Usa esa MISMA opción para PRECIO y DESCRIPCIÓN; no mezcles datos de opciones distintas. NO incluyas el nombre del negocio. Máximo 60 caracteres. Solo el título, sin comillas ni explicación. NO incluyas datos de contacto.`,
  emailTitle: `Genera el TÍTULO DEL EMAIL (emailTitle). Gancho de marketing corto para newsletter. Opciones: "[XX]% OFF", "DESDE $[PRICE]", "2x1 en [servicio]", o frase corta llamativa. Máximo 30 caracteres. Solo el título, sin comillas ni explicación.`,
  aboutOffer: `Genera la sección "ACERCA DE ESTA OFERTA" (aboutOffer/summaryEs). TEXTO PLANO sin etiquetas HTML. Estructura: 1) Redes sociales (nombres de plataformas), 2) Intro del negocio (2-3 oraciones), 3) Opciones de compra: "Paga $X por [descripción] (Valor $Y).", 4) Detalles con guiones (-) para listas, 5) Cierre con "¡Haz click en comprar!". Tono cálido y vendedor. NO incluyas datos de contacto.`,
  whatWeLike: `Genera la sección "LO QUE NOS GUSTA" (whatWeLike/noteworthy). TEXTO PLANO: una línea por beneficio separadas por salto de línea. NUNCA uses etiquetas HTML, asteriscos ni viñetas con símbolo. Ejemplo: "Ahorras $14 (50% OFF)\nIncluye buffet completo\nUbicación céntrica". 4-8 beneficios. Empezar con el mejor punto de venta. Incluir ahorro en $ o %. Cada línea máximo 100 caracteres, sin punto al final. NO incluyas datos de contacto.`,
  goodToKnow: `Genera la sección "LO QUE CONVIENE SABER" (goodToKnow/goodToKnowEs). TEXTO PLANO sin etiquetas HTML. Títulos en MAYÚSCULAS seguidos de salto de línea. Ejemplo: "INFORMACIÓN GENERAL\nImpuestos incluidos...\n\nRESTRICCIONES\nNo válido en feriados...". DEBE tener exactamente 5 secciones: INFORMACIÓN GENERAL, RESTRICCIONES, RESERVACIONES/CANCELACIONES, MÉTODO DE CANJE, PERIODO DE VALIDEZ. Respetar estrictamente las restricciones proporcionadas. Para PERIODO DE VALIDEZ usa SOLO validOnHolidays, startDate, endDate y blackoutDates. NO uses otros campos de categoría en esa subsección. NO incluyas datos de contacto.`,
  howToUseEs: `Genera la sección "CÓMO USAR" (howToUseEs). TEXTO PLANO sin etiquetas HTML. Instrucciones paso a paso para canjear el voucher. Para QR: mencionar escaneo en local. Para listado: mencionar presentar voucher en dirección. Para eventos: mencionar taquilla y código QR. Incluir periodo de validez y si es válido en feriados. Si hay contacto para canje, usa SOLO contactDetails. NUNCA uses partnerEmail ni otros contactos.`,
}

const CONTACT_FIELD_PATTERN = /(email|correo|mail|phone|telefono|teléfono|celular|whatsapp|contact|instagram|facebook|tiktok|linkedin|twitter|url|website|web|sitio)/i

function extractSocialPlatforms(rawSocialMedia: string): string {
  const lowerValue = rawSocialMedia.toLowerCase()
  const platforms = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'twitter', label: 'X/Twitter' },
    { key: 'x.com', label: 'X/Twitter' },
  ]

  const found = platforms
    .filter(platform => lowerValue.includes(platform.key))
    .map(platform => platform.label)

  return found.length > 0 ? Array.from(new Set(found)).join(', ') : 'Disponibles (sin detalle público)'
}

function validateRequiredFields(input: BookingContentInput): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = []
  
  if (!input.businessName?.trim()) {
    missingFields.push('nombre del negocio')
  }
  
  if (!input.addressAndHours?.trim()) {
    missingFields.push('dirección y horario del negocio')
  }
  
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

function parsePricingAmount(value?: string): number | null {
  if (!value) return null

  const normalized = value.replace(/[^0-9.,]/g, '').replace(/,/g, '')
  if (!normalized) return null

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function getTitleAnchorOption(input: BookingContentInput) {
  if (!input.pricingOptions || input.pricingOptions.length === 0) {
    return null
  }

  const pricedOptions = input.pricingOptions
    .map((option, index) => ({
      option,
      index,
      price: parsePricingAmount(option.price),
    }))
    .filter(({ price }) => price != null)

  if (pricedOptions.length === 0) {
    return { option: input.pricingOptions[0], index: 0 }
  }

  return pricedOptions.reduce((lowest, current) => {
    if ((current.price ?? Number.POSITIVE_INFINITY) < (lowest.price ?? Number.POSITIVE_INFINITY)) {
      return current
    }
    return lowest
  })
}

function getAdditionalTitleOptions(
  input: BookingContentInput,
  anchorIndex: number
): string[] {
  if (!input.pricingOptions || input.pricingOptions.length <= 1) {
    return []
  }

  const seen = new Set<string>()

  return input.pricingOptions
    .map((option, index) => ({ option, index }))
    .filter(({ index }) => index !== anchorIndex)
    .map(({ option }) => option.title?.trim() || option.description?.trim() || '')
    .filter(Boolean)
    .filter((label) => {
      const normalized = label.toLowerCase()
      if (seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
    .slice(0, 3)
}

function formatBusinessInfo(input: BookingContentInput): string {
  const lines: string[] = []
  
  lines.push(`Nombre del negocio: ${input.businessName || 'No especificado'}`)
  lines.push('Datos de contacto: [INTERNOS - NO MOSTRAR EN EL CONTENIDO FINAL]')
  
  if (input.parentCategory) {
    lines.push(`Categoría: ${input.parentCategory}`)
  }
  if (input.subCategory1) {
    lines.push(`Subcategoría: ${input.subCategory1}`)
  }
  if (input.subCategory2) {
    lines.push(`Subcategoría 2: ${input.subCategory2}`)
  }
  
  if (input.startDate) {
    const startDate = new Date(input.startDate)
    lines.push(`Fecha de inicio: ${startDate.toLocaleDateString('es-ES', { timeZone: PANAMA_TIMEZONE })}`)
  }
  if (input.endDate) {
    const endDate = new Date(input.endDate)
    lines.push(`Fecha de fin: ${endDate.toLocaleDateString('es-ES', { timeZone: PANAMA_TIMEZONE })}`)
  }
  if (input.startDate || input.endDate || input.validOnHolidays || input.blackoutDates) {
    lines.push(`\nDATOS PARA PERIODO DE VALIDEZ (usar SOLO estos en la subsección PERIODO DE VALIDEZ de goodToKnow):`)
    if (input.validOnHolidays) {
      lines.push(`  - Válido en feriados: ${input.validOnHolidays}`)
    }
    if (input.startDate) {
      const startDate = new Date(input.startDate)
      lines.push(`  - Fecha de inicio de validez: ${startDate.toLocaleDateString('es-ES', { timeZone: PANAMA_TIMEZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`)
    }
    if (input.endDate) {
      const endDate = new Date(input.endDate)
      lines.push(`  - Fecha de fin de validez: ${endDate.toLocaleDateString('es-ES', { timeZone: PANAMA_TIMEZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`)
    }
    if (input.blackoutDates) {
      lines.push(`  - Fechas blackout: ${input.blackoutDates}`)
    }
  }
  
  if (input.addressAndHours) {
    lines.push(`Dirección y horario: ${input.addressAndHours}`)
  }
  if (input.socialMedia) {
    lines.push(`Redes sociales (solo plataformas, sin usuarios/enlaces): ${extractSocialPlatforms(input.socialMedia)}`)
  }
  
  if (input.pricingOptions && input.pricingOptions.length > 0) {
    lines.push(`\nOpciones de precio:`)
    input.pricingOptions.forEach((option, index) => {
      lines.push(`  Opción ${index + 1}:`)
      if (option.title) lines.push(`    - Título: ${option.title}`)
      if (option.description) lines.push(`    - Descripción: ${option.description}`)
      if (option.price) lines.push(`    - Precio: $${option.price}`)
      if (option.realValue) lines.push(`    - Valor real: $${option.realValue}`)
      if (option.quantity) lines.push(`    - Cantidad: ${option.quantity}`)
      const limitNum = parseInt(option.limitByUser?.trim() || '', 10)
      lines.push(`    - Máx por persona: ${limitNum > 0 && limitNum <= 10 ? limitNum : 'Ilimitado'}`)
      const giftNum = parseInt(option.maxGiftsPerUser?.trim() || '', 10)
      lines.push(`    - Máx para regalar: ${giftNum > 0 && giftNum <= 10 ? giftNum : 'Ilimitado'}`)
    })
  }

  const titleAnchor = getTitleAnchorOption(input)
  if (titleAnchor) {
    lines.push(`\nOPCIÓN ANCLA PARA TÍTULOS (usar SIEMPRE esta misma opción para nameEs y shortTitle):`)
    lines.push(`  - Opción seleccionada: ${titleAnchor.index + 1}`)
    if (titleAnchor.option.title) lines.push(`  - Título: ${titleAnchor.option.title}`)
    if (titleAnchor.option.description) lines.push(`  - Descripción: ${titleAnchor.option.description}`)
    if (titleAnchor.option.price) lines.push(`  - Precio: $${titleAnchor.option.price}`)
    if (titleAnchor.option.realValue) lines.push(`  - Valor real: $${titleAnchor.option.realValue}`)
    lines.push(`  - Regla: No mezclar datos de otras opciones y no usar "hasta" ni rangos salvo que aparezcan explícitamente en esta opción.`)

    const additionalTitleOptions = getAdditionalTitleOptions(input, titleAnchor.index)
    if (additionalTitleOptions.length > 0) {
      lines.push(`\nOTRAS OPCIONES DISPONIBLES PARA MENCIONAR BREVEMENTE EN nameEs (solo si ayuda y hay espacio):`)
      additionalTitleOptions.forEach((label) => {
        lines.push(`  - ${label}`)
      })
    }
  }
  
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
  if (input.hasOtherBranches) {
    const hasOthers = input.hasOtherBranches.toLowerCase() === 'sí' || input.hasOtherBranches.toLowerCase() === 'si' || input.hasOtherBranches.toLowerCase() === 'yes'
    lines.push(`  - Otras sucursales: ${input.hasOtherBranches} ${hasOthers ? '(HAY otras sucursales donde NO es válido - RESTRICCIÓN)' : '(No hay otras sucursales)'}`)
  }
  if (input.cancellationPolicy) {
    lines.push(`  - Política de cancelación: ${input.cancellationPolicy}`)
  }
  
  if (input.contactDetails?.trim()) {
    lines.push(`\nCONTACTO PARA CANJE (incluir solo en howToUseEs):`)
    lines.push(`  - ${input.contactDetails.trim()}`)
  }
  if (input.redemptionMethods && input.redemptionMethods.length > 0) {
    lines.push(`  - Métodos de canje: ${input.redemptionMethods.join(', ')}`)
  }
  
  // Category-specific dynamic fields from InformacionAdicionalStep
  const knownFields = new Set([
    'businessName', 'partnerEmail', 'parentCategory', 'subCategory1', 'subCategory2',
    'startDate', 'endDate', 'addressAndHours', 'socialMedia', 'contactDetails',
    'pricingOptions', 'redemptionMode', 'includesTaxes', 'validOnHolidays', 'blackoutDates',
    'hasOtherBranches', 'cancellationPolicy', 'redemptionMethods',
    // Output fields
    'nameEs', 'shortTitle', 'emailTitle', 'whatWeLike', 'aboutCompany', 'aboutOffer', 'goodToKnow', 'howToUseEs',
    // Non-content form fields
    'category', 'merchant', 'additionalEmails', 'opportunityId', 'campaignDuration', 'campaignDurationUnit',
    'isRecurring', 'recurringOfferLink', 'paymentType', 'paymentInstructions',
    'legalName', 'rucDv', 'bankAccountName', 'bank', 'accountNumber', 'accountType',
    'provinceDistrictCorregimiento', 'hasExclusivity', 'exclusivityCondition',
    'marketValidation', 'additionalComments', 'dealImages', 'bookingAttachments',
    'approverName', 'approverEmail', 'approverBusinessName', 'additionalInfo',
  ])
  
  const additionalFields = Object.entries(input).filter(([key, value]) =>
    !knownFields.has(key) &&
    !CONTACT_FIELD_PATTERN.test(key) &&
    value != null &&
    value !== ''
  )
  
  if (additionalFields.length > 0) {
    lines.push(`\nInformación adicional específica de la categoría:`)
    additionalFields.forEach(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
      lines.push(`  - ${label}: ${String(value)}`)
    })
  }
  
  return lines.join('\n')
}

async function generateSection(
  sectionName: keyof BookingContentOutput,
  input: BookingContentInput
): Promise<string> {
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
${sectionName === 'howToUseEs'
  ? '- Solo en howToUseEs puedes incluir el contacto de canje proveniente de contactDetails.'
  : '- NO incluyas datos de contacto visibles (nombres de contacto, emails, teléfonos, WhatsApp, usuarios @ ni enlaces).'}

Genera SOLO la sección solicitada.`
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || ''
}

async function generateAllSections(input: BookingContentInput): Promise<BookingContentOutput> {
  const validation = validateRequiredFields(input)
  if (!validation.valid) {
    const errorMessage = `No hay información suficiente para generar este contenido. Por favor complete los siguientes campos requeridos: ${validation.missingFields.join(', ')}.`
    return {
      nameEs: errorMessage,
      shortTitle: errorMessage,
      emailTitle: errorMessage,
      whatWeLike: errorMessage,
      aboutOffer: errorMessage,
      goodToKnow: errorMessage,
      howToUseEs: errorMessage,
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

Responde en formato JSON con las siguientes claves.
CRÍTICO: TODO el contenido debe ser TEXTO PLANO. NUNCA incluyas etiquetas HTML como <strong>, <ul>, <li>, <p>, <br>, <b>, <i>. Usa saltos de línea para separar, guiones (-) para listas, y MAYÚSCULAS para títulos de sección.

{
  "nameEs": "texto plano, idealmente 60-200 caracteres, formato base 'Paga $X por [descripción] en [Negocio] (Valor $Y)'. Si hay múltiples opciones, usar siempre la opción ancla de menor precio para X, descripción y Y, sin mezclar datos. Si existen otras opciones relacionadas, se puede añadir una mención breve y factual al final. Puede quedar por debajo de 60 caracteres si alargarlo haría el título artificial o impreciso. No usar 'hasta' salvo que aparezca explícitamente.",
  "shortTitle": "texto plano, máximo 60 caracteres, formato '$PRECIO por DESCRIPCIÓN', sin nombre del negocio. Si hay múltiples opciones, usar siempre la opción ancla de menor precio para PRECIO y DESCRIPCIÓN, sin mezclar datos.",
  "emailTitle": "texto plano, máximo 30 caracteres, ej: '50% OFF' o 'DESDE $14'",
  "aboutOffer": "texto plano: intro, opciones de compra 'Paga $X por [desc] (Valor $Y)', detalles con guiones (-), cierre con '¡Haz click en comprar!'",
  "whatWeLike": "texto plano: una línea por beneficio separadas por salto de línea. Ej: 'Ahorras $14 (50% OFF)\nIncluye buffet completo\nUbicación céntrica'",
  "goodToKnow": "texto plano: 5 secciones con títulos en MAYÚSCULAS. Ej: 'INFORMACIÓN GENERAL\nImpuestos incluidos...\n\nRESTRICCIONES\nNo válido en feriados...'",
  "howToUseEs": "texto plano: instrucciones paso a paso para canjear el voucher, método de redención, periodo de validez y si aplica en feriados. Solo aquí se puede incluir contactDetails como contacto de canje"
}

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional ni bloques de código.
- NO excedas los límites de caracteres indicados.
- NO inventes información. Solo usa la información proporcionada.
- NO incluyas datos de contacto visibles en nameEs, shortTitle, emailTitle, aboutOffer, whatWeLike ni goodToKnow.
- Si incluyes contacto en howToUseEs, usa SOLO contactDetails.
- NUNCA uses partnerEmail ni otros contactos como contacto para howToUseEs.
- Si falta información importante para una sección, usa el mensaje de error para esa sección.`
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
      nameEs: parsed.nameEs || '',
      shortTitle: parsed.shortTitle || '',
      emailTitle: parsed.emailTitle || '',
      whatWeLike: parsed.whatWeLike || '',
      aboutOffer: parsed.aboutOffer || '',
      goodToKnow: parsed.goodToKnow || '',
      howToUseEs: parsed.howToUseEs || '',
    }
  } catch {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse AI-generated content')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const identifier = userId || getClientIp(request)
    const rateLimitResult = await applyRateLimit(
      aiLimiter,
      identifier,
      'Demasiadas solicitudes de IA. Espera un momento antes de generar más contenido.'
    )
    if (rateLimitResult) return rateLimitResult

    const body = await request.json()
    const { section, formData } = body as { section?: keyof BookingContentOutput; formData: BookingContentInput }
    
    if (!formData.businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }
    
    if (section) {
      const content = await generateSection(section, formData)
      return NextResponse.json({ [section]: content })
    } else {
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
