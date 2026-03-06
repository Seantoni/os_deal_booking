import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile } from '@/lib/auth/roles'
import { getDealById } from '@/lib/api/external-oferta'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await getUserProfile()
    const role = profile?.role
    if (!role || !['admin', 'sales'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or Sales access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const dealId = id?.trim()
    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'Invalid deal ID' },
        { status: 400 }
      )
    }

    const result = await getDealById(dealId, {
      userId,
      triggeredBy: 'manual',
    })

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 502
      return NextResponse.json(
        { success: false, error: result.error, logId: result.logId },
        { status }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      logId: result.logId,
    })
  } catch (error) {
    console.error('[GET /api/external-oferta/deals/[id]]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
