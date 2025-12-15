import { NextResponse } from 'next/server'
import { resetSettingsToDefaults } from '@/app/actions/settings'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const result = await resetSettingsToDefaults()
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in /api/settings/reset:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

