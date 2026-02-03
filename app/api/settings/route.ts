import { NextResponse } from 'next/server'
import { getSettingsFromDB, saveSettingsToDB } from '@/app/actions/settings'
import type { BookingSettings } from '@/types'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/roles'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Require admin role - settings contain internal business rules
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin access required' },
      { status: 403 }
    )
  }

  try {
    const result = await getSettingsFromDB()
    if (result.success) {
      // Add cache-control headers to prevent browser caching
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in /api/settings GET:', error)
    const errorMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Failed to fetch settings'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Require admin role - only admins can modify settings
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
    const settings: BookingSettings = body

    // Debug logging
    logger.info('[/api/settings POST] Received settings:', {
      hasRequestFormFields: !!settings?.requestFormFields,
      requestFormFieldsCount: settings?.requestFormFields ? Object.keys(settings.requestFormFields).length : 0,
    })

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Settings data is required' },
        { status: 400 }
      )
    }

    const result = await saveSettingsToDB(settings)
    logger.info('[/api/settings POST] Save result:', { success: result.success })
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in /api/settings POST:', error)
    const errorMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Failed to save settings'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

