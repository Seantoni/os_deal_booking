/**
 * Deal Metrics Sync API Route
 * 
 * POST /api/deal-metrics/sync
 * 
 * Fetches deal metrics from external Oferta API and stores to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { syncDealMetrics, getDealMetricsSummary } from '@/app/actions/deal-metrics'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Auth check
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

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
    return NextResponse.json({
      success: false,
      message: 'Internal error',
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    }, { status: 500 })
  }
}

// GET handler for checking status and summary
export async function GET() {
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
