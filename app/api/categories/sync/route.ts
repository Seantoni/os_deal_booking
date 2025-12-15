import { NextResponse } from 'next/server'
import { syncCategoriesToDatabase } from '@/app/actions/categories'
import type { CategoryHierarchy } from '@/types'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const hierarchy: CategoryHierarchy = body.hierarchy

    if (!hierarchy) {
      return NextResponse.json(
        { success: false, error: 'Category hierarchy is required' },
        { status: 400 }
      )
    }

    const result = await syncCategoriesToDatabase(hierarchy)

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in /api/categories/sync:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

