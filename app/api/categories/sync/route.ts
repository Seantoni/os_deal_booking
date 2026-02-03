import { NextResponse } from 'next/server'
import { syncCategoriesToDatabase } from '@/app/actions/categories'
import type { CategoryHierarchy } from '@/types'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/roles'

export async function POST(request: Request) {
  // Require admin role - category sync can modify/deactivate taxonomy
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin access required' },
      { status: 403 }
    )
  }

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
    const errorMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Category sync failed'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

