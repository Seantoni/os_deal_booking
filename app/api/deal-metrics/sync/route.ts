/**
 * Deal Metrics Sync API Route
 * 
 * POST /api/deal-metrics/sync
 * 
 * Fetches deal metrics from external Oferta API and stores to database
 * Restricted to admin users only
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncDealMetrics, getDealMetricsSummary } from '@/app/actions/deal-metrics'
import { requireAdmin } from '@/lib/auth/roles'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Require admin role - metrics sync can fetch large data and cause churn
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unauthorized: Admin access required' },
      { status: 403 }
    )
  }

  const { userId } = await auth()

  try {
    const body = await request.json()
    const sinceDays = body.sinceDays || 30
    const fetchAll = body.fetchAll || false

    // Sync metrics (fetch from API + store to DB)
    const result = await syncDealMetrics({
      sinceDays,
      userId,
      fetchAll,
    })

    const durationMs = Date.now() - startTime

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message,
        error: result.error,
        logId: result.logId,
        durationMs,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      stats: result.stats,
      logId: result.logId,
      durationMs,
    })
  } catch (error) {
    console.error('Deal metrics sync error:', error)
    const errorMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Internal error'
    return NextResponse.json({
      success: false,
      message: errorMessage,
      durationMs: Date.now() - startTime,
    }, { status: 500 })
  }
}

// GET handler for checking status and summary
export async function GET() {
  // Require admin role - exposes configuration and metrics summary
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin access required' },
      { status: 403 }
    )
  }

  const hasToken = !!process.env.EXTERNAL_OFERTA_API_TOKEN

  try {
    const summary = await getDealMetricsSummary()

    return NextResponse.json({
      configured: hasToken,
      endpoint: 'POST /api/deal-metrics/sync',
      description: 'Fetches deal metrics from external Oferta API and stores to database',
      params: {
        sinceDays: 'Number of days to look back (default: 30)',
        fetchAll: 'If true, fetches all pages (default: false)',
      },
      summary,
    })
  } catch {
    return NextResponse.json({
      configured: hasToken,
      endpoint: 'POST /api/deal-metrics/sync',
      summary: null,
    })
  }
}
