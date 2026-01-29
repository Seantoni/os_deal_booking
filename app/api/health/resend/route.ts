/**
 * Health Check: Resend Email Service
 * 
 * GET /api/health/resend
 * 
 * Tests the Resend API connection
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: 'RESEND_API_KEY not configured'
    })
  }

  try {
    // Test the API key by fetching domains (lightweight call)
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      return NextResponse.json({
        success: true,
        configured: true,
        message: 'Resend API connection verified'
      })
    } else {
      const error = await response.text()
      return NextResponse.json({
        success: false,
        configured: true,
        error: `API returned ${response.status}: ${error}`
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      configured: true,
      error: error instanceof Error ? error.message : 'Connection failed'
    })
  }
}
