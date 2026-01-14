/**
 * External Oferta Vendor API Client
 * 
 * Sends vendor data to the external OfertaSimple API
 */

import { logApiCall } from '../shared/logger'
import { formatValidationError } from '../shared/http'
import { EXTERNAL_VENDOR_API_URL, EXTERNAL_API_TOKEN } from '../shared/constants'
import { mapBusinessToVendor, validateVendorRequest } from './mapper'
import type { ExternalOfertaVendorRequest, ExternalOfertaVendorResponse, SendVendorResult } from './types'
import type { Business } from '@/types/business'
import { prisma } from '@/lib/prisma'

/**
 * Send vendor payload directly to external API
 * Low-level function that handles the HTTP request
 */
export async function sendExternalVendorPayload(
  payload: ExternalOfertaVendorRequest,
  options?: {
    endpoint?: string
    userId?: string
    triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system'
  }
): Promise<SendVendorResult & { responseStatusCode?: number; responseRaw?: string }> {
  const startTime = Date.now()
  const endpoint = options?.endpoint || EXTERNAL_VENDOR_API_URL

  if (!EXTERNAL_API_TOKEN) {
    const error = 'API token not configured'
    const logId = await logApiCall({
      endpoint,
      method: 'POST',
      requestBody: payload,
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

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXTERNAL_API_TOKEN}`,
        'User-Agent': 'OfertaSimpleBooking/1.0',
      },
      body: JSON.stringify(payload),
    })

    const durationMs = Date.now() - startTime
    const responseText = await response.text()

    let responseData: ExternalOfertaVendorResponse | Record<string, unknown>
    let isJson = false
    try {
      responseData = JSON.parse(responseText)
      isJson = true
    } catch {
      responseData = { raw: responseText.substring(0, 500) }
    }

    const typedResponse = responseData as ExternalOfertaVendorResponse & { status?: string; error?: string; message?: string }
    const success = response.ok && isJson && typedResponse.status === 'success'
    const externalVendorId = success ? typedResponse.id : undefined

    let errorMessage: string | undefined
    if (!success) {
      if (response.status === 422) {
        errorMessage = formatValidationError(responseData, responseText)
      } else {
        errorMessage = typedResponse.error || typedResponse.message || `HTTP ${response.status}`
      }
    }

    const logId = await logApiCall({
      endpoint,
      method: 'POST',
      requestBody: payload,
      userId: options?.userId,
      triggeredBy: options?.triggeredBy || 'system',
      durationMs,
      response: {
        statusCode: response.status,
        body: isJson ? (responseData as Record<string, unknown>) : undefined,
        raw: responseText.substring(0, 4000),
        success,
        errorMessage,
        externalId: externalVendorId,
      },
    })

    return {
      success,
      externalVendorId,
      error: success ? undefined : errorMessage,
      logId,
      responseStatusCode: response.status,
      responseRaw: responseText.substring(0, 4000),
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    const logId = await logApiCall({
      endpoint,
      method: 'POST',
      requestBody: payload,
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

/**
 * Send a business to the external OfertaSimple API as a vendor
 * 
 * This function:
 * 1. Maps Business data to vendor API format
 * 2. Validates required fields
 * 3. Sends to external API
 * 4. Updates Business.osAdminVendorId on success
 * 
 * @param business - Internal business data
 * @param options - Additional options
 * @returns Result with external vendor ID if successful
 * 
 * @example
 * ```typescript
 * const result = await sendVendorToExternalApi(business, { userId: 'user_123' })
 * if (result.success) {
 *   console.log('Created vendor:', result.externalVendorId)
 * }
 * ```
 */
export async function sendVendorToExternalApi(
  business: Business,
  options?: {
    userId?: string
    triggeredBy?: 'manual' | 'cron' | 'webhook' | 'system'
    /** Override default sales type (0=Regular) */
    salesType?: number
  }
): Promise<SendVendorResult> {
  const startTime = Date.now()

  // Check if API is configured
  if (!EXTERNAL_API_TOKEN) {
    return { success: false, error: 'API token not configured' }
  }

  // Check if vendor already exists
  if (business.osAdminVendorId) {
    return { 
      success: false, 
      error: `Vendor already exists with external ID: ${business.osAdminVendorId}`,
      externalVendorId: parseInt(business.osAdminVendorId, 10) || undefined
    }
  }

  // Map business to vendor payload
  const payload = mapBusinessToVendor(business, {
    salesType: options?.salesType,
  })

  // Validate payload
  const validation = validateVendorRequest(payload)
  if (!validation.valid) {
    const errorMessage = `Payload validation failed: ${validation.errors.join(', ')}`
    console.error('[External Vendor API]', errorMessage, { payload })

    const logId = await logApiCall({
      endpoint: EXTERNAL_VENDOR_API_URL,
      method: 'POST',
      requestBody: payload,
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

  // Send to external API
  const result = await sendExternalVendorPayload(payload, {
    userId: options?.userId,
    triggeredBy: options?.triggeredBy || 'system',
  })

  // Update Business with external vendor ID on success
  if (result.success && result.externalVendorId) {
    try {
      await prisma.business.update({
        where: { id: business.id },
        data: { osAdminVendorId: String(result.externalVendorId) },
      })
      console.log(`[External Vendor API] Updated business ${business.id} with external vendor ID ${result.externalVendorId}`)
    } catch (updateError) {
      // Log but don't fail - vendor was created successfully
      console.error('[External Vendor API] Failed to update business with vendor ID:', updateError)
    }
  }

  return result
}
