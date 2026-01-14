/**
 * External API Request Logger
 * 
 * Tracks all requests made to the external Oferta API (deals and vendors)
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { TriggerType } from './http'

interface LogRequestParams {
  endpoint: string
  method?: string
  requestBody: unknown
  bookingRequestId?: string
  userId?: string
  triggeredBy?: TriggerType
}

interface LogResponseParams {
  requestId: string
  statusCode: number
  responseBody?: Record<string, unknown>
  responseRaw?: string
  success: boolean
  errorMessage?: string
  externalId?: number
  durationMs?: number
}

/**
 * Create a new API request log entry (call before making request)
 */
export async function logApiRequest(params: LogRequestParams): Promise<string> {
  const { endpoint, method = 'POST', requestBody, bookingRequestId, userId, triggeredBy } = params
  
  // Sanitize headers (don't log auth tokens)
  const sanitizedHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'OfertaSimpleBooking/1.0',
    // Note: Authorization header intentionally excluded
  }
  
  const record = await prisma.externalApiRequest.create({
    data: {
      endpoint,
      method,
      requestBody: requestBody as unknown as Prisma.InputJsonValue,
      headers: sanitizedHeaders as unknown as Prisma.InputJsonValue,
      bookingRequestId,
      userId,
      triggeredBy,
      success: false, // Will be updated after response
    },
  })
  
  return record.id
}

/**
 * Update the API request log with response data (call after receiving response)
 */
export async function logApiResponse(params: LogResponseParams): Promise<void> {
  const { 
    requestId, 
    statusCode, 
    responseBody, 
    responseRaw, 
    success, 
    errorMessage, 
    externalId,
    durationMs 
  } = params
  
  await prisma.externalApiRequest.update({
    where: { id: requestId },
    data: {
      statusCode,
      responseBody: responseBody as unknown as Prisma.InputJsonValue,
      responseRaw,
      success,
      errorMessage,
      externalId,
      durationMs,
    },
  })
}

/**
 * Combined helper to log a complete API request/response cycle
 */
export async function logApiCall(
  params: LogRequestParams & {
    response: {
      statusCode: number
      body?: Record<string, unknown>
      raw?: string
      success: boolean
      errorMessage?: string
      externalId?: number
    }
    durationMs?: number
  }
): Promise<string> {
  const { endpoint, method = 'POST', requestBody, bookingRequestId, userId, triggeredBy, response, durationMs } = params
  
  const sanitizedHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'OfertaSimpleBooking/1.0',
  }
  
  // Log full request body structure for debugging on failure
  if (!response.success) {
    // Detect request type from endpoint
    const isDealRequest = endpoint.includes('/deals')
    const isVendorRequest = endpoint.includes('/vendors')
    
    if (isDealRequest) {
      const body = requestBody as Record<string, unknown>
      console.error('[External API Logger] Deal request failed:', {
        nameEs: body.nameEs,
        slug: body.slug,
        expiresOn: body.expiresOn,
        categoryId: body.categoryId,
        vendorName: body.vendorName,
        priceOptionsCount: Array.isArray(body.priceOptions) ? body.priceOptions.length : 0,
      })
    } else if (isVendorRequest) {
      const body = requestBody as Record<string, unknown>
      console.error('[External API Logger] Vendor request failed:', {
        name: body.name,
        email: body.email,
        salesType: body.salesType,
      })
    } else {
      console.error('[External API Logger] Unknown request type failed:', { endpoint })
    }
  }
  
  const record = await prisma.externalApiRequest.create({
    data: {
      endpoint,
      method,
      requestBody: requestBody as unknown as Prisma.InputJsonValue,
      headers: sanitizedHeaders as unknown as Prisma.InputJsonValue,
      bookingRequestId,
      userId,
      triggeredBy,
      statusCode: response.statusCode,
      responseBody: response.body as unknown as Prisma.InputJsonValue,
      responseRaw: response.raw,
      success: response.success,
      errorMessage: response.errorMessage,
      externalId: response.externalId,
      durationMs,
    },
  })
  
  return record.id
}

/**
 * Get recent API requests for debugging/monitoring
 */
export async function getRecentApiRequests(options?: {
  limit?: number
  skip?: number
  bookingRequestId?: string
  successOnly?: boolean
  failedOnly?: boolean
}) {
  const { limit = 50, skip = 0, bookingRequestId, successOnly, failedOnly } = options || {}
  
  return prisma.externalApiRequest.findMany({
    where: {
      ...(bookingRequestId && { bookingRequestId }),
      ...(successOnly && { success: true }),
      ...(failedOnly && { success: false }),
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      bookingRequest: {
        select: {
          id: true,
          name: true,
          businessEmail: true,
        },
      },
    },
  })
}

/**
 * Count total API requests matching filters
 */
export async function countApiRequests(options?: {
  bookingRequestId?: string
  successOnly?: boolean
  failedOnly?: boolean
}) {
  const { bookingRequestId, successOnly, failedOnly } = options || {}
  
  return prisma.externalApiRequest.count({
    where: {
      ...(bookingRequestId && { bookingRequestId }),
      ...(successOnly && { success: true }),
      ...(failedOnly && { success: false }),
    },
  })
}

/**
 * Get API request statistics
 */
export async function getApiRequestStats(days: number = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const [total, successful, failed] = await Promise.all([
    prisma.externalApiRequest.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.externalApiRequest.count({
      where: { createdAt: { gte: since }, success: true },
    }),
    prisma.externalApiRequest.count({
      where: { createdAt: { gte: since }, success: false },
    }),
  ])
  
  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : 'N/A',
  }
}
