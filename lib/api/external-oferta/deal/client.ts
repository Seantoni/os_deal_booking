/**
 * External Oferta Deal API Client
 * 
 * Sends deal data to the external OfertaSimple API
 */

import { logApiCall } from '../shared/logger'
import { formatValidationError } from '../shared/http'
import { EXTERNAL_DEAL_API_URL, EXTERNAL_API_TOKEN, DEFAULT_SECTION_MAPPINGS } from '../shared/constants'
import { mapBookingFormToApi } from './mapper'
import type { ExternalOfertaDealRequest, ExternalOfertaDealResponse, ExternalOfertaPriceOption, ExternalOfertaDeal, GetDealByIdResult, SendDealResult } from './types'
import type { BookingFormData } from '@/components/RequestForm/types'
import type { Prisma } from '@prisma/client'
import { formatDateForPanama, parseDateInPanamaTime } from '@/lib/date/timezone'
import { extractBusinessName } from '@/lib/utils/request-name-parsing'

/**
 * Generate a URL-safe slug from a business name and launch date
 */
function generateSlug(businessName: string, startDate?: Date | string): string {
  const slugBase = businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single
    .trim()

  const dateSlug = formatLaunchDateSlug(startDate)
  return dateSlug ? `${slugBase}-${dateSlug}` : slugBase
}

function formatLaunchDateSlug(startDate?: Date | string): string | null {
  if (!startDate) return null
  const date = startDate instanceof Date ? startDate : new Date(startDate)
  if (!date || Number.isNaN(date.getTime())) return null

  const ymd = formatDateForPanama(date)
  const [year, monthRaw, dayRaw] = ymd.split('-')
  if (!year || !monthRaw || !dayRaw) return null

  const day = dayRaw.padStart(2, '0')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const monthIndex = Math.max(0, Math.min(11, parseInt(monthRaw, 10) - 1))
  const month = months[monthIndex]
  const yearShort = year.slice(-2)
  return `${day}${month}${yearShort}`
}

/**
 * Calculate expiration date based on end date and campaign duration
 */
function calculateExpiresOn(endDate: Date, campaignDurationMonths: number): string {
  // Do the month math using Panama dates to avoid UTC shifts (off-by-one day)
  const endYmd = formatDateForPanama(endDate) // YYYY-MM-DD in Panama
  const expiresDate = parseDateInPanamaTime(endYmd) // midnight Panama in UTC
  expiresDate.setUTCMonth(expiresDate.getUTCMonth() + campaignDurationMonths)
  return formatOfertaSimpleBoundary(expiresDate, 'end')
}

function formatOfertaSimpleBoundary(date: Date, boundary: 'start' | 'end'): string {
  // OfertaSimple expects a datetime string; we send day-boundaries in Panama time.
  // Panama is UTC-5 year-round, so include a stable offset.
  const ymd = formatDateForPanama(date) // YYYY-MM-DD in Panama
  const time = boundary === 'start' ? '00:00:00' : '23:59:59'
  return `${ymd}T${time}-05:00`
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

function normalizeAdditionalBankAccounts(value: Prisma.JsonValue | null | undefined): BookingFormData['additionalBankAccounts'] {
  if (!value) return []

  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return []
    }
  }

  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      bankAccountName: String(item.bankAccountName || '').trim(),
      bank: String(item.bank || '').trim(),
      accountNumber: String(item.accountNumber || '').trim(),
      accountType: String(item.accountType || '').trim(),
    }))
    .filter((item) => Object.values(item).some((fieldValue) => fieldValue.length > 0))
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
  // AI-generated content fields
  nameEs?: string | null
  shortTitle?: string | null
  emailTitle?: string | null
  aboutOffer?: string | null
  whatWeLike?: string | null
  goodToKnow?: string | null
  howToUseEs?: string | null
  businessReview?: string | null
  addressAndHours?: string | null
  paymentInstructions?: string | null
  additionalBankAccounts?: Prisma.JsonValue
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

function normalizePayloadForExternalApi(payload: ExternalOfertaDealRequest): ExternalOfertaDealRequest {
  return {
    ...payload,
    priceOptions: Array.isArray(payload.priceOptions)
      ? payload.priceOptions.map((opt) => {
          const { title, ...rest } = opt as ExternalOfertaPriceOption & { title?: string }
          if (!rest.description && title) {
            rest.description = title
          }
          return rest
        }) as ExternalOfertaPriceOption[]
      : payload.priceOptions,
  }
}

/**
 * Send deal payload directly to external API
 * Low-level function that handles the HTTP request
 */
export async function sendExternalDealPayload(
  payload: ExternalOfertaDealRequest,
  options?: {
    endpoint?: string
    bookingRequestId?: string
    userId?: string
    triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system' | 'repost'
    resendOfLogId?: string
  }
): Promise<SendDealResult & { responseStatusCode?: number; responseRaw?: string }> {
  const startTime = Date.now()
  const endpoint = options?.endpoint || EXTERNAL_DEAL_API_URL

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

    const typedResponse = responseData as ExternalOfertaDealResponse & { status?: string; error?: string; message?: string }
    const success = response.ok && isJson && typedResponse.status === 'success'
    const externalId = success ? typedResponse.id : undefined

    let errorMessage: string | undefined
    if (!success) {
      if (response.status === 422) {
        errorMessage = formatValidationError(responseData, responseText)
      } else {
        errorMessage = typedResponse.error || typedResponse.message || `HTTP ${response.status}`
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
        body: isJson ? (responseData as Record<string, unknown>) : undefined,
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
    triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system' | 'repost'
    /** Override the deal start/end dates sent to OfertaSimple (used when booking an event) */
    runAt?: Date | string | null
    endAt?: Date | string | null
    /** Current state of the contract (sent to external API as contractState) */
    contractState?: string | null
  }
): Promise<SendDealResult> {
  const startTime = Date.now()
  
  // Check if API is configured
  if (!EXTERNAL_API_TOKEN) {
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
  
  // Get business name (merchant field in DB, fallback to name), and normalize
  // any formatted request-name values like "Business | Feb-27-2026 | #5".
  const normalizedMerchant = bookingRequest.merchant ? extractBusinessName(bookingRequest.merchant) : ''
  const normalizedName = bookingRequest.name ? extractBusinessName(bookingRequest.name) : ''
  const normalizedBusinessName = bookingRequest.businessName ? extractBusinessName(bookingRequest.businessName) : ''
  const businessName = normalizedMerchant || normalizedName || normalizedBusinessName || 'Unknown Business'
  
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
      pricingOptions = bookingRequest.pricingOptions as typeof pricingOptions
    }
  }
  
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
      dealImages = bookingRequest.dealImages as typeof dealImages
    }
  }
  
  // Build BookingFormData-like object for mapper
  const formData: Partial<BookingFormData> = {
    businessName,
    partnerEmail: bookingRequest.businessEmail,
    endDate: endDate.toISOString().split('T')[0],
    campaignDuration: bookingRequest.campaignDuration || '3',
    offerMargin: bookingRequest.offerMargin || '', // Comisión OfertaSimple (maps to oufferMargin in API)
    pricingOptions: pricingOptions as BookingFormData['pricingOptions'],
    nameEs: bookingRequest.nameEs || '',
    shortTitle: bookingRequest.shortTitle || '',
    emailTitle: bookingRequest.emailTitle || '',
    aboutOffer: bookingRequest.aboutOffer || '',
    whatWeLike: bookingRequest.whatWeLike || '',
    goodToKnow: bookingRequest.goodToKnow || '',
    howToUseEs: bookingRequest.howToUseEs || '',
    businessReview: bookingRequest.businessReview || '',
    addressAndHours: bookingRequest.addressAndHours || '',
    paymentInstructions: bookingRequest.paymentInstructions || '',
    additionalBankAccounts: normalizeAdditionalBankAccounts(bookingRequest.additionalBankAccounts),
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
  
  // Look up the linked business's external vendor ID for precise matching.
  // Falls back to vendorName-only if no business/vendor is linked.
  let resolvedVendorId: number | null = null
  try {
    const { prisma } = await import('@/lib/prisma')
    
    // Try via opportunityId → business → osAdminVendorId
    if (bookingRequest.opportunityId) {
      const opp = await prisma.opportunity.findUnique({
        where: { id: bookingRequest.opportunityId },
        select: { business: { select: { osAdminVendorId: true } } },
      })
      if (opp?.business?.osAdminVendorId) {
        resolvedVendorId = parseInt(opp.business.osAdminVendorId, 10) || null
      }
    }
    
    // Fallback: look up business by email
    if (!resolvedVendorId && bookingRequest.businessEmail) {
      const business = await prisma.business.findFirst({
        where: { contactEmail: bookingRequest.businessEmail },
        select: { osAdminVendorId: true },
      })
      if (business?.osAdminVendorId) {
        resolvedVendorId = parseInt(business.osAdminVendorId, 10) || null
      }
    }
  } catch {
    // Non-blocking — proceed without vendorId if lookup fails
  }

  // Use mapper to build the payload (includes all pricing options properly)
  const payload = mapBookingFormToApi(formData as BookingFormData, {
    slug: generateSlug(businessName, finalRunAt ?? startDate ?? undefined),
    expiresOn: calculateExpiresOn(finalEndAt || endDate, campaignMonths),
    categoryId: 17, // Hardcoded for now
    vendorId: resolvedVendorId ?? undefined,
    // API requirement: day boundaries (00:00 and 23:59) in Panama time
    runAt: finalRunAt ? formatOfertaSimpleBoundary(finalRunAt, 'start') : null,
    endAt: finalEndAt ? formatOfertaSimpleBoundary(finalEndAt, 'end') : null,
    section: section, // Mapped from category
    contractState: options?.contractState ?? '20',
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
      endpoint: EXTERNAL_DEAL_API_URL,
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

  try {
    const result = await sendExternalDealPayload(payload, {
      endpoint: EXTERNAL_DEAL_API_URL,
      bookingRequestId: bookingRequest.id,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
    })
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[External API] Request failed:', error)
    const logId = await logApiCall({
      endpoint: EXTERNAL_DEAL_API_URL,
      method: 'POST',
      requestBody: payload,
      bookingRequestId: bookingRequest.id,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs: Date.now() - startTime,
      response: { statusCode: 0, success: false, errorMessage },
    })
    return { success: false, error: errorMessage, logId }
  }
}

/**
 * Fetch a deal from the external OfertaSimple API by its ID
 * GET /external/api/deals/{id}
 */
export async function getDealById(
  dealId: number | string,
  options?: {
    userId?: string
    triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system'
  }
): Promise<GetDealByIdResult> {
  const startTime = Date.now()
  const endpoint = `${EXTERNAL_DEAL_API_URL}/${dealId}`

  if (!EXTERNAL_API_TOKEN) {
    const error = 'API token not configured'
    const logId = await logApiCall({
      endpoint,
      method: 'GET',
      requestBody: { dealId },
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'manual',
      durationMs: Date.now() - startTime,
      response: { statusCode: 0, success: false, errorMessage: error },
    })
    return { success: false, error, logId }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${EXTERNAL_API_TOKEN}`,
        'User-Agent': 'OfertaSimpleBooking/1.0',
      },
      cache: 'no-store',
    })

    const durationMs = Date.now() - startTime
    const responseText = await response.text()

    let responseData: unknown
    let isJson = false
    try {
      responseData = JSON.parse(responseText)
      isJson = true
    } catch {
      responseData = { raw: responseText.substring(0, 500) }
    }

    if (!response.ok) {
      const isCloudflareBlock = !isJson && responseText.includes('Just a moment')
      const errorMessage = response.status === 404
        ? `Deal ${dealId} not found`
        : isCloudflareBlock
          ? `Deal API blocked by Cloudflare (HTTP ${response.status}). The server IP may need to be whitelisted.`
          : `HTTP ${response.status}: ${(responseData as Record<string, unknown>)?.message || responseText.substring(0, 200)}`

      const logId = await logApiCall({
        endpoint,
        method: 'GET',
        requestBody: { dealId },
        userId: options?.userId,
        triggeredBy: options?.triggeredBy || 'manual',
        durationMs,
        response: {
          statusCode: response.status,
          body: isJson ? (responseData as Record<string, unknown>) : undefined,
          raw: responseText.substring(0, 4000),
          success: false,
          errorMessage,
        },
      })

      return { success: false, error: errorMessage, logId }
    }

    const logId = await logApiCall({
      endpoint,
      method: 'GET',
      requestBody: { dealId },
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'manual',
      durationMs,
      response: {
        statusCode: response.status,
        body: isJson ? (responseData as Record<string, unknown>) : undefined,
        raw: responseText.substring(0, 4000),
        success: true,
      },
    })

    return {
      success: true,
      data: responseData as ExternalOfertaDeal,
      logId,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    const logId = await logApiCall({
      endpoint,
      method: 'GET',
      requestBody: { dealId },
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'manual',
      durationMs,
      response: { statusCode: 0, success: false, errorMessage },
    })

    return { success: false, error: errorMessage, logId }
  }
}
