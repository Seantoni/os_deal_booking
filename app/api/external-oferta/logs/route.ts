/**
 * API endpoint to fetch external API request logs
 * 
 * GET /api/external-oferta/logs?page=1&limit=20
 */

import { NextResponse } from 'next/server'
import { getRecentApiRequests, getApiRequestStats, countApiRequests } from '@/lib/api/external-oferta'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const bookingRequestId = searchParams.get('bookingRequestId') || undefined
    const successOnly = searchParams.get('successOnly') === 'true'
    const failedOnly = searchParams.get('failedOnly') === 'true'

    // Build filter options
    const filterOptions = {
      bookingRequestId,
      successOnly,
      failedOnly,
    }

    // Count total matching records
    const total = await countApiRequests(filterOptions)
    const totalPages = Math.ceil(total / limit)

    // Calculate skip for pagination
    const skip = (page - 1) * limit

    // Fetch logs for current page
    const paginatedLogs = await getRecentApiRequests({
      limit,
      skip,
      ...filterOptions,
    })

    // Get stats
    const stats = await getApiRequestStats(30)

    return NextResponse.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        stats,
      },
    })
  } catch (error) {
    console.error('Error fetching API logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

