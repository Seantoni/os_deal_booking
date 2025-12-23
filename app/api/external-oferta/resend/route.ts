import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { requireAdmin } from '@/lib/auth/roles'
import type { ExternalOfertaDealRequest } from '@/lib/api/external-oferta/types'
import { sendExternalDealPayload } from '@/lib/api/external-oferta/client'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { userId } = await auth()

    const body = await request.json().catch(() => null)
    const logId = body?.logId as string | undefined
    if (!logId) {
      return NextResponse.json({ success: false, error: 'logId is required' }, { status: 400 })
    }

    const record = await prisma.externalApiRequest.findUnique({
      where: { id: logId },
      select: {
        id: true,
        endpoint: true,
        method: true,
        requestBody: true,
        bookingRequestId: true,
      },
    })

    if (!record) {
      return NextResponse.json({ success: false, error: 'Log not found' }, { status: 404 })
    }

    // Safety: only allow resending to the known OfertaSimple deals endpoint
    if (record.method?.toUpperCase() !== 'POST') {
      return NextResponse.json({ success: false, error: 'Only POST requests can be resent' }, { status: 400 })
    }
    if (!record.endpoint?.includes('/external/api/deals')) {
      return NextResponse.json({ success: false, error: 'Unsupported endpoint for resend' }, { status: 400 })
    }

    const payload = record.requestBody as unknown as ExternalOfertaDealRequest
    const result = await sendExternalDealPayload(payload, {
      endpoint: record.endpoint,
      bookingRequestId: record.bookingRequestId || undefined,
      userId: userId || undefined,
      triggeredBy: 'manual',
      resendOfLogId: record.id,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error resending external oferta request:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


