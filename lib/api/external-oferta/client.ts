/**
 * External Oferta API Client
 * 
 * Sends deal data to the external OfertaSimple API when a booking is completed
 */

import { logApiCall } from './logger'
import type { ExternalOfertaDealRequest, ExternalOfertaDealResponse } from './types'

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
  const expiresDate = new Date(endDate)
  expiresDate.setMonth(expiresDate.getMonth() + campaignDurationMonths)
  return expiresDate.toISOString().split('T')[0] // YYYY-MM-DD
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
  businessEmail: string
  endDate: Date | string
  campaignDuration?: string | null
  pricingOptions?: Array<{ title?: string; description?: string }> | unknown | null
  // Optional fields for future use
  aboutOffer?: string | null
  whatWeLike?: string | null
  goodToKnow?: string | null
}

interface SendDealResult {
  success: boolean
  externalId?: number
  error?: string
  logId?: string
}

/**
 * Send a booked deal to the external OfertaSimple API
 */
export async function sendDealToExternalApi(
  bookingRequest: BookingRequestData,
  options?: {
    userId?: string
    triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system'
  }
): Promise<SendDealResult> {
  const startTime = Date.now()
  
  // Check if API is configured
  if (!EXTERNAL_API_TOKEN) {
    console.warn('[External API] EXTERNAL_OFERTA_API_TOKEN not configured, skipping API call')
    return { success: false, error: 'API token not configured' }
  }

  // Build the API payload
  const endDate = typeof bookingRequest.endDate === 'string' 
    ? new Date(bookingRequest.endDate) 
    : bookingRequest.endDate
  
  const campaignMonths = parseCampaignDuration(bookingRequest.campaignDuration)
  
  // Get business name (merchant field in DB, fallback to name)
  const businessName = bookingRequest.merchant || bookingRequest.name || 'Unknown Business'
  
  // Get subtitle from first pricing option (pricingOptions is stored as JSON)
  const pricingOptions = Array.isArray(bookingRequest.pricingOptions) 
    ? bookingRequest.pricingOptions as Array<{ title?: string; description?: string }>
    : []
  const firstOption = pricingOptions[0]
  const subtitle = firstOption?.title || firstOption?.description || businessName

  const payload: ExternalOfertaDealRequest = {
    // Required fields
    nameEs: businessName,
    slug: generateSlug(businessName),
    emailSubject: businessName,
    summaryEs: subtitle, // Using subtitle (first pricing option title)
    expiresOn: calculateExpiresOn(endDate, campaignMonths),
    categoryId: 17, // Hardcoded for now
    vendorName: businessName,
  }

  console.log('[External API] Sending deal to external API:', {
    bookingRequestId: bookingRequest.id,
    businessName,
    slug: payload.slug,
    expiresOn: payload.expiresOn,
  })

  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXTERNAL_API_TOKEN}`,
        'User-Agent': 'OfertaSimpleBooking/1.0', // Required to pass Cloudflare
      },
      body: JSON.stringify(payload),
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
    const errorMessage = !success
      ? (responseData as any).error || (responseData as any).message || `HTTP ${response.status}`
      : undefined

    // Log to database
    const logId = await logApiCall({
      endpoint: EXTERNAL_API_URL,
      method: 'POST',
      requestBody: payload,
      bookingRequestId: bookingRequest.id,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs,
      response: {
        statusCode: response.status,
        body: isJson ? responseData : undefined,
        raw: !isJson ? responseText.substring(0, 1000) : undefined,
        success,
        errorMessage,
        externalId,
      },
    })

    if (success) {
      console.log('[External API] Deal created successfully:', { externalId, logId })
      return { success: true, externalId, logId }
    } else {
      console.error('[External API] Failed to create deal:', { errorMessage, logId })
      return { success: false, error: errorMessage, logId }
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('[External API] Request failed:', error)

    // Log error to database
    const logId = await logApiCall({
      endpoint: EXTERNAL_API_URL,
      method: 'POST',
      requestBody: payload,
      bookingRequestId: bookingRequest.id,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs,
      response: {
        statusCode: 0,
        success: false,
        errorMessage,
      },
    })

    return { success: false, error: errorMessage, logId }
  }
}

