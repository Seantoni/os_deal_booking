/**
 * External Oferta Deal Metrics API Client
 * 
 * Fetches deal metrics from the external OfertaSimple API
 * GET /external/api/deal-metrics
 */

import { logApiCall } from '../shared/logger'
import { EXTERNAL_DEAL_METRICS_API_URL, EXTERNAL_API_TOKEN } from '../shared/constants'
import type { DealMetricsResponse, FetchMetricsResult } from './types'

export interface FetchMetricsOptions {
  since: string | Date // ISO 8601 format, required
  limit?: number // Max 1000, default 100
  offset?: number // Default 0
  userId?: string
  triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system'
}

/**
 * Fetch deal metrics from external API
 */
export async function fetchDealMetrics(
  options: FetchMetricsOptions
): Promise<FetchMetricsResult> {
  const startTime = Date.now()
  const endpoint = EXTERNAL_DEAL_METRICS_API_URL

  // Format since parameter
  const sinceParam = options.since instanceof Date 
    ? options.since.toISOString() 
    : options.since

  // Build URL with query params
  const url = new URL(endpoint)
  url.searchParams.set('since', sinceParam)
  if (options.limit) url.searchParams.set('limit', String(options.limit))
  if (options.offset) url.searchParams.set('offset', String(options.offset))

  const fullUrl = url.toString()

  if (!EXTERNAL_API_TOKEN) {
    const error = 'API token not configured'
    const logId = await logApiCall({
      endpoint: fullUrl,
      method: 'GET',
      requestBody: { since: sinceParam, limit: options.limit, offset: options.offset },
      userId: options.userId,
      triggeredBy: options.triggeredBy || 'system',
      durationMs: Date.now() - startTime,
      response: {
        statusCode: 0,
        success: false,
        errorMessage: error,
      },
    })
    return { success: false, error, logId }
  }

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${EXTERNAL_API_TOKEN}`,
        'User-Agent': 'OfertaSimpleBooking/1.0',
        'Accept': 'application/json',
      },
    })

    const durationMs = Date.now() - startTime
    const responseText = await response.text()

    let responseData: DealMetricsResponse | Record<string, unknown>
    let isJson = false
    try {
      responseData = JSON.parse(responseText)
      isJson = true
    } catch {
      responseData = { raw: responseText.substring(0, 500) }
    }

    const success = response.ok && isJson

    let errorMessage: string | undefined
    if (!success) {
      const typedResponse = responseData as Record<string, unknown>
      errorMessage = (typedResponse.error as string) || (typedResponse.message as string) || `HTTP ${response.status}`
    }

    const logId = await logApiCall({
      endpoint: fullUrl,
      method: 'GET',
      requestBody: { since: sinceParam, limit: options.limit, offset: options.offset },
      userId: options.userId,
      triggeredBy: options.triggeredBy || 'system',
      durationMs,
      response: {
        statusCode: response.status,
        body: isJson ? (responseData as Record<string, unknown>) : undefined,
        raw: responseText.substring(0, 4000),
        success,
        errorMessage,
      },
    })

    if (success) {
      return {
        success: true,
        data: responseData as DealMetricsResponse,
        logId,
      }
    } else {
      return {
        success: false,
        error: errorMessage,
        logId,
      }
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    const logId = await logApiCall({
      endpoint: fullUrl,
      method: 'GET',
      requestBody: { since: sinceParam, limit: options.limit, offset: options.offset },
      userId: options.userId,
      triggeredBy: options.triggeredBy || 'system',
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

/**
 * Fetch all deal metrics with pagination
 * Automatically fetches all pages using limit/offset
 * Default limit is 1000 (max allowed by API)
 */
export async function fetchAllDealMetrics(
  options: Omit<FetchMetricsOptions, 'offset'>
): Promise<FetchMetricsResult & { totalFetched?: number; pagesLoaded?: number }> {
  const allDeals: DealMetricsResponse['deals'] = []
  let offset = 0
  const limit = options.limit || 1000 // Use max limit for efficiency
  let totalInApi = 0
  let pagesLoaded = 0

  const maxPages = 50 // Safety limit to prevent infinite loops
  
  while (pagesLoaded < maxPages) {
    const result = await fetchDealMetrics({
      ...options,
      limit,
      offset,
    })

    if (!result.success || !result.data) {
      return result
    }

    pagesLoaded++
    allDeals.push(...result.data.deals)
    totalInApi = result.data.total

    // Check if we've fetched all
    if (result.data.returned < limit || allDeals.length >= totalInApi) {
      break
    }

    offset += limit
    
    // Rate limiting: wait 2 seconds before next request
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return {
    success: true,
    data: {
      since: options.since instanceof Date ? options.since.toISOString() : options.since,
      data_as_of: new Date().toISOString(),
      limit: allDeals.length,
      offset: 0,
      total: totalInApi,
      returned: allDeals.length,
      deals: allDeals,
    },
    totalFetched: allDeals.length,
    pagesLoaded,
  }
}
