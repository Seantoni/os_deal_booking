/**
 * External Oferta API Client
 * 
 * Sends deal data to the external OfertaSimple API when a booking is completed
 */

import { logApiCall } from './logger'
import { mapBookingFormToApi } from './mapper'
import type { ExternalOfertaDealRequest, ExternalOfertaDealResponse } from './types'
import type { BookingFormData } from '@/components/RequestForm/types'
import type { Prisma } from '@prisma/client'
import { formatDateForPanama, parseDateInPanamaTime } from '@/lib/date/timezone'

const EXTERNAL_API_URL = process.env.EXTERNAL_OFERTA_API_URL || 'https://ofertasimple.com/external/api/deals'
const EXTERNAL_API_TOKEN = process.env.EXTERNAL_OFERTA_API_TOKEN

/**
 * Generate a URL-safe slug from a business name
 */
function generateSlug(businessName: string): string {
  const timestamp = Date.now()
  const slug = businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single
    .trim()
  
  return `${slug}-${timestamp}`
}

/**
 * Calculate expiration date based on end date and campaign duration
 */
function calculateExpiresOn(endDate: Date, campaignDurationMonths: number): string {
  // Do the month math using Panama dates to avoid UTC shifts (off-by-one day)
  const endYmd = formatDateForPanama(endDate) // YYYY-MM-DD in Panama
  const expiresDate = parseDateInPanamaTime(endYmd) // midnight Panama in UTC
  expiresDate.setUTCMonth(expiresDate.getUTCMonth() + campaignDurationMonths)
  return formatDateForPanama(expiresDate)
}

function formatOfertaSimpleBoundary(date: Date, boundary: 'start' | 'end'): string {
  // OfertaSimple expects a datetime string; we send day-boundaries in Panama time.
  // Panama is UTC-5 year-round, so include a stable offset.
  const ymd = formatDateForPanama(date) // YYYY-MM-DD in Panama
  const time = boundary === 'start' ? '00:00:00' : '23:59:59'
  return `${ymd}T${time}-05:00`
}

// Default external API section mappings (used if settings not available)
const DEFAULT_SECTION_MAPPINGS: Record<string, string> = {
  'HOTELES': 'Hoteles',
  'RESTAURANTES': 'Restaurantes',
  'SHOWS Y EVENTOS': 'Shows y Eventos',
  'SERVICIOS': 'Servicios',
  'BIENESTAR Y BELLEZA': 'Bienestar y Belleza',
  'ACTIVIDADES': 'Actividades',
  'CURSOS': 'Cursos',
  'PRODUCTOS': 'Productos',
  'SPA & DAY SPA': 'Bienestar y Belleza',
  'GIMNASIOS & FITNESS': 'Servicios',
  'MÉDICO ESTÉTICO': 'Bienestar y Belleza',
  'DENTAL & ESTÉTICA DENTAL': 'Bienestar y Belleza',
  'LABORATORIOS Y SALUD CLÍNICA': 'Servicios',
  'TURISMO & TOURS': 'Actividades',
  'MASCOTAS:Veterinaria': 'Servicios',
  'MASCOTAS:Grooming': 'Servicios',
  'MASCOTAS:Productos': 'Productos',
}

/**
 * Resolve external API section from category path
 * Checks specific path first, then parent categories
 */
function resolveSection(
  parentCategory: string | null | undefined,
  subCategory1: string | null | undefined,
  subCategory2: string | null | undefined,
  sectionMappings: Record<string, string> = DEFAULT_SECTION_MAPPINGS
): string | null {
  if (!parentCategory) return null
  
  // Build category paths from most specific to least
  const paths: string[] = []
  if (parentCategory && subCategory1 && subCategory2) {
    paths.push(`${parentCategory}:${subCategory1}:${subCategory2}`)
  }
  if (parentCategory && subCategory1) {
    paths.push(`${parentCategory}:${subCategory1}`)
  }
  if (parentCategory) {
    paths.push(parentCategory)
  }
  
  // Find first matching section
  for (const path of paths) {
    if (sectionMappings[path]) {
      return sectionMappings[path]
    }
  }
  
  return null
}

/**
 * Parse campaign duration string to get months
 * Examples: "3 meses", "6 meses", "1 año" -> 3, 6, 12
 */
function parseCampaignDuration(duration: string | null | undefined): number {
  if (!duration) return 3 // Default 3 months
  
  const lower = duration.toLowerCase()
  
  // Handle "X meses" format
  const monthsMatch = lower.match(/(\d+)\s*mes/)
  if (monthsMatch) return parseInt(monthsMatch[1], 10)
  
  // Handle "X año(s)" format
  const yearsMatch = lower.match(/(\d+)\s*año/)
  if (yearsMatch) return parseInt(yearsMatch[1], 10) * 12
  
  // Handle common durations
  if (lower.includes('trimestre') || lower === '3') return 3
  if (lower.includes('semestre') || lower === '6') return 6
  if (lower.includes('año') || lower === '12') return 12
  
  // Try to parse as number
  const num = parseInt(duration, 10)
  return isNaN(num) ? 3 : num
}

interface BookingRequestData {
  id: string
  // Database uses 'merchant' for business name, 'name' as fallback
  merchant?: string | null
  name?: string | null
  businessName?: string | null
  businessEmail: string
  startDate?: Date | string
  endDate: Date | string
  campaignDuration?: string | null
  offerMargin?: string | null // Comisión OfertaSimple (percentage)
  pricingOptions?: Prisma.JsonValue
  // Optional fields for future use
  shortTitle?: string | null
  aboutOffer?: string | null
  whatWeLike?: string | null
  goodToKnow?: string | null
  businessReview?: string | null
  addressAndHours?: string | null
  paymentInstructions?: string | null
  giftVouchers?: string | null
  dealImages?: Prisma.JsonValue
  socialMedia?: string | null
  contactDetails?: string | null
  opportunityId?: string | null
  // Category fields for section mapping
  parentCategory?: string | null
  subCategory1?: string | null
  subCategory2?: string | null
  subCategory3?: string | null
}

interface SendDealResult {
  success: boolean
  externalId?: number
  error?: string
  logId?: string
}

function safeStringify(value: unknown, maxLen: number = 1500): string {
  try {
    const s = JSON.stringify(value)
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : s
  } catch {
    return String(value)
  }
}

function formatValidationError(responseData: unknown, responseText: string): string {
  const data = (responseData ?? {}) as any

  const candidates = [
    data?.errors,
    data?.error?.errors,
    data?.validation,
    data?.detail,
    data?.details,
    data?.data?.errors,
    data?.message,
    data?.error,
  ]

  const first = candidates.find((v) => v !== undefined && v !== null)

  if (Array.isArray(first)) {
    return `Validation failed: ${first.map(String).join(', ')}`
  }

  if (first && typeof first === 'object') {
    const entries = Object.entries(first as Record<string, unknown>)
    const formatted = entries
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.map(String).join(', ') : String(v)}`)
      .join('; ')
    return `Validation failed: ${formatted || safeStringify(first)}`
  }

  if (typeof first === 'string' && first.trim() && first.trim().toLowerCase() !== 'validation failed') {
    return `Validation failed: ${first}`
  }

  // Last resort: include a snippet of the raw body so we can see what the API returned.
  const rawSnippet = responseText.length > 1000 ? responseText.slice(0, 1000) + '…' : responseText
  return `Validation failed (raw): ${rawSnippet || safeStringify(data)}`
}

function normalizePayloadForExternalApi(payload: ExternalOfertaDealRequest): ExternalOfertaDealRequest {
  // OfertaSimple live validator rejects `priceOptions[*][title]` as unexpected.
  // Strip it and preserve it into description if needed.
  return {
    ...payload,
    priceOptions: Array.isArray(payload.priceOptions)
      ? (payload.priceOptions as any[]).map((opt) => {
          const { title, ...rest } = opt || {}
          return {
            ...rest,
            description: rest.description ?? (title ? String(title) : null),
          }
        })
      : payload.priceOptions,
  }
}

export async function sendExternalDealPayload(
  payload: ExternalOfertaDealRequest,
  options?: {
    endpoint?: string
    bookingRequestId?: string
    userId?: string
    triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system'
    resendOfLogId?: string
  }
): Promise<SendDealResult & { responseStatusCode?: number; responseRaw?: string }> {
  const startTime = Date.now()
  const endpoint = options?.endpoint || EXTERNAL_API_URL

  if (!EXTERNAL_API_TOKEN) {
    const error = 'API token not configured'
    const logId = await logApiCall({
      endpoint,
      method: 'POST',
      requestBody: payload,
      bookingRequestId: options?.bookingRequestId,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs: Date.now() - startTime,
      response: {
        statusCode: 0,
        success: false,
        errorMessage: error,
      },
    })
    return { success: false, error, logId }
  }

  const payloadToSend = normalizePayloadForExternalApi(payload)
  if (options?.resendOfLogId) {
    console.log('[External API] Resending request:', { resendOfLogId: options.resendOfLogId })
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXTERNAL_API_TOKEN}`,
        'User-Agent': 'OfertaSimpleBooking/1.0',
      },
      body: JSON.stringify(payloadToSend),
    })

    const durationMs = Date.now() - startTime
    const responseText = await response.text()

    let responseData: ExternalOfertaDealResponse | Record<string, unknown>
    let isJson = false
    try {
      responseData = JSON.parse(responseText)
      isJson = true
    } catch {
      responseData = { raw: responseText.substring(0, 500) }
    }

    const success = response.ok && isJson && (responseData as any).status === 'success'
    const externalId = success ? (responseData as ExternalOfertaDealResponse).id : undefined

    let errorMessage: string | undefined
    if (!success) {
      if (response.status === 422) {
        errorMessage = formatValidationError(responseData, responseText)
      } else {
        errorMessage = (responseData as any).error || (responseData as any).message || `HTTP ${response.status}`
      }
      if (options?.resendOfLogId) {
        errorMessage = `[resendOf:${options.resendOfLogId}] ${errorMessage || 'Request failed'}`
      }
    }

    const logId = await logApiCall({
      endpoint,
      method: 'POST',
      requestBody: payloadToSend,
      bookingRequestId: options?.bookingRequestId,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs,
      response: {
        statusCode: response.status,
        body: isJson ? (responseData as any) : undefined,
        raw: responseText.substring(0, 4000),
        success,
        errorMessage,
        externalId,
      },
    })

    return {
      success,
      externalId,
      error: success ? undefined : errorMessage,
      logId,
      responseStatusCode: response.status,
      responseRaw: responseText.substring(0, 4000),
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const finalError = options?.resendOfLogId ? `[resendOf:${options.resendOfLogId}] ${errorMessage}` : errorMessage

    const logId = await logApiCall({
      endpoint,
      method: 'POST',
      requestBody: payloadToSend,
      bookingRequestId: options?.bookingRequestId,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs,
      response: {
        statusCode: 0,
        success: false,
        errorMessage: finalError,
      },
    })

    return { success: false, error: finalError, logId }
  }
}

/**
 * Send a booked deal to the external OfertaSimple API
 */
export async function sendDealToExternalApi(
  bookingRequest: BookingRequestData,
  options?: {
    userId?: string
    triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system'
    /** Override the deal start/end dates sent to OfertaSimple (used when booking an event) */
    runAt?: Date | string | null
    endAt?: Date | string | null
  }
): Promise<SendDealResult> {
  const startTime = Date.now()
  
  // Check if API is configured
  if (!EXTERNAL_API_TOKEN) {
    console.warn('[External API] EXTERNAL_OFERTA_API_TOKEN not configured, skipping API call')
    return { success: false, error: 'API token not configured' }
  }

  // Convert BookingRequestData to BookingFormData format for mapper
  const startDate =
    bookingRequest.startDate
      ? (typeof bookingRequest.startDate === 'string' ? new Date(bookingRequest.startDate) : bookingRequest.startDate)
      : null

  const endDate = typeof bookingRequest.endDate === 'string' ? new Date(bookingRequest.endDate) : bookingRequest.endDate

  // When booking an event, we should use the final booked dates from the event
  const finalRunAt =
    options?.runAt === undefined
      ? startDate
      : options.runAt
        ? (typeof options.runAt === 'string' ? new Date(options.runAt) : options.runAt)
        : null

  const finalEndAt =
    options?.endAt === undefined
      ? endDate
      : options.endAt
        ? (typeof options.endAt === 'string' ? new Date(options.endAt) : options.endAt)
        : null
  
  const campaignMonths = parseCampaignDuration(bookingRequest.campaignDuration)
  
  // Get business name (merchant field in DB, fallback to name)
  const businessName = bookingRequest.merchant || bookingRequest.name || bookingRequest.businessName || 'Unknown Business'
  
  // Convert pricing options to proper format (handle JSON parsing if needed)
  let pricingOptions: Array<{
    title?: string
    description?: string
    price?: string
    realValue?: string
    quantity?: string
    limitByUser?: string
    endAt?: string
    expiresIn?: string
    imageUrl?: string
  }> = []
  
  if (bookingRequest.pricingOptions) {
    if (typeof bookingRequest.pricingOptions === 'string') {
      try {
        pricingOptions = JSON.parse(bookingRequest.pricingOptions)
      } catch {
        pricingOptions = []
      }
    } else if (Array.isArray(bookingRequest.pricingOptions)) {
      pricingOptions = bookingRequest.pricingOptions as any
    }
  }
  
  // Debug: Log raw pricing options from DB to trace quantity field
  console.log('[External API] Raw pricingOptions from DB:', pricingOptions.map((opt: any) => ({
    title: opt.title,
    price: opt.price,
    quantity: opt.quantity,
    quantityType: typeof opt.quantity,
  })))
  
  // Convert dealImages to proper format
  let dealImages: Array<{ url: string; order: number }> = []
  if (bookingRequest.dealImages) {
    if (typeof bookingRequest.dealImages === 'string') {
      try {
        dealImages = JSON.parse(bookingRequest.dealImages)
      } catch {
        dealImages = []
      }
    } else if (Array.isArray(bookingRequest.dealImages)) {
      dealImages = bookingRequest.dealImages as any
    }
  }
  
  // Build BookingFormData-like object for mapper
  const formData: Partial<BookingFormData> = {
    businessName,
    partnerEmail: bookingRequest.businessEmail,
    endDate: endDate.toISOString().split('T')[0],
    campaignDuration: bookingRequest.campaignDuration || '3',
    offerMargin: bookingRequest.offerMargin || '', // Comisión OfertaSimple (maps to oufferMargin in API)
    pricingOptions: pricingOptions as any,
    shortTitle: bookingRequest.shortTitle || '',
    aboutOffer: bookingRequest.aboutOffer || '',
    whatWeLike: bookingRequest.whatWeLike || '',
    goodToKnow: bookingRequest.goodToKnow || '',
    businessReview: bookingRequest.businessReview || '',
    addressAndHours: bookingRequest.addressAndHours || '',
    paymentInstructions: bookingRequest.paymentInstructions || '',
    giftVouchers: bookingRequest.giftVouchers || 'Sí',
    dealImages: dealImages,
    socialMedia: bookingRequest.socialMedia || '',
    contactDetails: bookingRequest.contactDetails || '',
    opportunityId: bookingRequest.opportunityId || '',
    // Category fields for section mapping
    parentCategory: bookingRequest.parentCategory || '',
    subCategory1: bookingRequest.subCategory1 || '',
    subCategory2: bookingRequest.subCategory2 || '',
  }
  
  // Resolve section from category hierarchy
  const section = resolveSection(
    bookingRequest.parentCategory,
    bookingRequest.subCategory1,
    bookingRequest.subCategory2
  )
  
  // Use mapper to build the payload (includes all pricing options properly)
  const payload = mapBookingFormToApi(formData as BookingFormData, {
    slug: generateSlug(businessName),
    expiresOn: calculateExpiresOn(finalEndAt || endDate, campaignMonths),
    categoryId: 17, // Hardcoded for now
    // API requirement: day boundaries (00:00 and 23:59) in Panama time
    runAt: finalRunAt ? formatOfertaSimpleBoundary(finalRunAt, 'start') : null,
    endAt: finalEndAt ? formatOfertaSimpleBoundary(finalEndAt, 'end') : null,
    section: section, // Mapped from category
  })
  
  // Validate payload before sending
  const validationErrors: string[] = []
  if (!payload.nameEs || payload.nameEs.trim() === '') {
    validationErrors.push('nameEs is required')
  }
  if (!payload.slug || payload.slug.trim() === '') {
    validationErrors.push('slug is required')
  }
  if (!payload.emailSubject || payload.emailSubject.trim() === '') {
    validationErrors.push('emailSubject is required')
  }
  if (!payload.summaryEs || payload.summaryEs.trim() === '') {
    validationErrors.push('summaryEs is required')
  }
  if (!payload.expiresOn) {
    validationErrors.push('expiresOn is required')
  }
  if (!payload.categoryId || payload.categoryId === 0) {
    validationErrors.push('categoryId is required')
  }
  if (!payload.vendorId && !payload.vendorName) {
    validationErrors.push('vendorId or vendorName is required')
  }
  
  // Validate price options if provided
  if (payload.priceOptions && Array.isArray(payload.priceOptions)) {
    if (payload.priceOptions.length === 0) {
      // Remove empty array - send null instead
      payload.priceOptions = null
    } else {
      payload.priceOptions.forEach((opt, index) => {
        if (typeof opt.price !== 'number' || opt.price <= 0) {
          validationErrors.push(`priceOptions[${index}].price must be a positive number (got: ${opt.price})`)
        }
      })
    }
  }
  
  if (validationErrors.length > 0) {
    const errorMessage = `Payload validation failed: ${validationErrors.join(', ')}`
    console.error('[External API]', errorMessage, { payload })
    
    // Log to database
    const logId = await logApiCall({
      endpoint: EXTERNAL_API_URL,
      method: 'POST',
      requestBody: payload,
      bookingRequestId: bookingRequest.id,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs: Date.now() - startTime,
      response: {
        statusCode: 0,
        success: false,
        errorMessage,
      },
    })
    
    return { success: false, error: errorMessage, logId }
  }

  const payloadToSend = normalizePayloadForExternalApi(payload)

  console.log('[External API] Sending deal to external API:', {
    bookingRequestId: bookingRequest.id,
    businessName,
    slug: payloadToSend.slug,
    expiresOn: payloadToSend.expiresOn,
    runAt: payloadToSend.runAt,
    endAt: payloadToSend.endAt,
    hasPriceOptions: !!payloadToSend.priceOptions,
    priceOptionsCount: Array.isArray(payloadToSend.priceOptions) ? payloadToSend.priceOptions.length : 0,
    imagesCount: Array.isArray(payloadToSend.images) ? payloadToSend.images.length : 0,
  })
  
  // Log pricing options details
  if (payloadToSend.priceOptions && Array.isArray(payloadToSend.priceOptions)) {
    console.log('[External API] Price options being sent:', payloadToSend.priceOptions.map((opt: any) => ({
      // title is intentionally stripped for compatibility
      price: opt.price,
      value: opt.value,
      description: opt.description,
      maximumQuantity: opt.maximumQuantity,
      limitByUser: opt.limitByUser,
      giftLimitPerUser: opt.giftLimitPerUser,
      endAt: opt.endAt,
      expiresIn: opt.expiresIn,
      oufferMargin: opt.oufferMargin,
    })))
  } else {
    console.warn('[External API] No price options in payload!', {
      priceOptions: payloadToSend.priceOptions,
      type: typeof payloadToSend.priceOptions,
      isArray: Array.isArray(payloadToSend.priceOptions),
    })
  }

  try {
    const result = await sendExternalDealPayload(payloadToSend, {
      endpoint: EXTERNAL_API_URL,
      bookingRequestId: bookingRequest.id,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
    })
    if (result.success) {
      console.log('[External API] Deal created successfully:', { externalId: result.externalId, logId: result.logId })
    } else {
      console.error('[External API] Failed to create deal:', { errorMessage: result.error, logId: result.logId })
    }
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[External API] Request failed:', error)
    const logId = await logApiCall({
      endpoint: EXTERNAL_API_URL,
      method: 'POST',
      requestBody: payloadToSend,
      bookingRequestId: bookingRequest.id,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs: Date.now() - startTime,
      response: { statusCode: 0, success: false, errorMessage },
    })
    return { success: false, error: errorMessage, logId }
  }
}

