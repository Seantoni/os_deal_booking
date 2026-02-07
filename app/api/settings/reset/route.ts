import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/auth/roles'
import { resetSettingsToDefaults } from '@/app/actions/settings'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    // Defense in depth: verify admin at the route level
    // (resetSettingsToDefaults also checks, but don't rely solely on the action)
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getUserRole()
    if (role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

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
