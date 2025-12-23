/**
 * Test endpoint for External Oferta API
 * 
 * POST /api/external-oferta/test
 * 
 * Sends a hardcoded test deal to the external API and logs the request
 */

import { NextResponse } from 'next/server'
import { logApiCall } from '@/lib/api/external-oferta'
import type { ExternalOfertaDealRequest } from '@/lib/api/external-oferta'

const EXTERNAL_API_URL = process.env.EXTERNAL_OFERTA_API_URL || 'https://ofertasimple.com/external/api/deals'
const EXTERNAL_API_TOKEN = process.env.EXTERNAL_OFERTA_API_TOKEN

export async function POST() {
  const startTime = Date.now()
  
  // Generate unique slug with timestamp
  const uniqueSlug = `test-deal-${Date.now()}`
  
  // Test payload with required fields
  // Note: Avoid word "consume" - blocked by Cloudflare WAF
  const testPayload: ExternalOfertaDealRequest = {
    nameEs: "Test: Paga 15 y recibe 30 en comidas",
    slug: uniqueSlug,
    emailSubject: "Test Deal",
    summaryEs: "Oferta de prueba desde el sistema de booking",
    expiresOn: "2025-12-31",
    categoryId: 17, // Valid category ID
    vendorName: "Test Vendor"
  }

  console.log('=== External Oferta API Test ===')
  console.log('API URL:', EXTERNAL_API_URL)
  console.log('Has Token:', !!EXTERNAL_API_TOKEN)
  console.log('Payload:', JSON.stringify(testPayload, null, 2))

  if (!EXTERNAL_API_TOKEN) {
    return NextResponse.json({
      success: false,
      error: 'EXTERNAL_OFERTA_API_TOKEN not configured',
      hint: 'Add EXTERNAL_OFERTA_API_TOKEN to your .env file'
    }, { status: 500 })
  }

  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXTERNAL_API_TOKEN}`,
        'User-Agent': 'OfertaSimpleBooking/1.0', // Required to pass Cloudflare
      },
      body: JSON.stringify(testPayload),
    })

    const durationMs = Date.now() - startTime
    const responseText = await response.text()
    
    console.log('Response status:', response.status)
    console.log('Response body:', responseText)
    console.log('Duration:', durationMs, 'ms')

    let responseData: Record<string, unknown>
    let isJson = false
    try {
      responseData = JSON.parse(responseText)
      isJson = true
    } catch {
      responseData = { raw: responseText.substring(0, 500) } // Truncate HTML responses
    }

    const success = response.ok && isJson
    const externalId = success && responseData.id ? Number(responseData.id) : undefined
    const errorMessage = !success 
      ? (responseData.error as string) || (responseData.message as string) || `HTTP ${response.status}`
      : undefined

    // Log to database
    const logId = await logApiCall({
      endpoint: EXTERNAL_API_URL,
      method: 'POST',
      requestBody: testPayload,
      triggeredBy: 'manual',
      durationMs,
      response: {
        statusCode: response.status,
        body: isJson ? responseData : undefined,
        raw: !isJson ? responseText.substring(0, 1000) : undefined,
        success,
        errorMessage,
        externalId,
      }
    })

    if (success) {
      return NextResponse.json({
        success: true,
        status: response.status,
        data: responseData,
        externalId,
        logId,
        durationMs,
        payload: testPayload
      })
    } else {
      return NextResponse.json({
        success: false,
        status: response.status,
        error: responseData,
        errorMessage,
        logId,
        durationMs,
        payload: testPayload,
        hint: responseText.includes('Page Not Found') 
          ? 'Cloudflare WAF may be blocking the request. Check for blocked words like "consume".'
          : undefined
      }, { status: response.status })
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error('External API error:', error)
    
    // Log error to database
    const logId = await logApiCall({
      endpoint: EXTERNAL_API_URL,
      method: 'POST',
      requestBody: testPayload,
      triggeredBy: 'manual',
      durationMs,
      response: {
        statusCode: 0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }
    })
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logId,
      durationMs,
      payload: testPayload
    }, { status: 500 })
  }
}

// GET handler to check configuration
export async function GET() {
  return NextResponse.json({
    configured: !!EXTERNAL_API_TOKEN,
    apiUrl: EXTERNAL_API_URL,
    instructions: 'POST to this endpoint to send a test deal to the external API',
    requiredEnvVars: [
      'EXTERNAL_OFERTA_API_TOKEN',
      'EXTERNAL_OFERTA_API_URL (optional, has default)'
    ],
    notes: [
      'Requests are logged to external_api_requests table',
      'Avoid using word "consume" - blocked by Cloudflare WAF',
      'Valid categoryId: 17 (restaurants)',
      'User-Agent header required to pass Cloudflare'
    ]
  })
}
