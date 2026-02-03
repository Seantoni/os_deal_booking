/**
 * Health Check: Resend Email Service
 * 
 * GET /api/health/resend
 * 
 * Tests the Resend API connection
 * Restricted to admin users only
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/roles'

export async function GET() {
  // Require admin role - this endpoint makes real API calls with secret keys
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin access required' },
      { status: 403 }
    )
  }

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
      // Only show detailed errors in development
      const rawError = await response.text()
      const errorMessage = process.env.NODE_ENV === 'development'
        ? `API returned ${response.status}: ${rawError}`
        : `API returned ${response.status}`
      
      return NextResponse.json({
        success: false,
        configured: true,
        error: errorMessage
      })
    }
  } catch (error) {
    // Only show detailed errors in development
    const errorMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Connection failed')
      : 'Connection failed'
    
    return NextResponse.json({
      success: false,
      configured: true,
      error: errorMessage
    })
  }
}
