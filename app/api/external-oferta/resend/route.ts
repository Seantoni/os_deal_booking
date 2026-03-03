import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { requireAdmin } from '@/lib/auth/roles'
import type { ExternalOfertaDealRequest } from '@/lib/api/external-oferta'
import type { ExternalOfertaVendorRequest } from '@/lib/api/external-oferta'
import { sendExternalDealPayload, sendExternalVendorPayload } from '@/lib/api/external-oferta'
import { externalApiLimiter, applyRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { userId } = await auth()

    // Apply strict rate limiting (5 req/min) for external API calls
    if (userId) {
      const rateLimitResult = await applyRateLimit(
        externalApiLimiter, 
        userId,
        'Demasiadas solicitudes a la API externa. Espera un momento antes de reintentar.'
      )
      if (rateLimitResult) return rateLimitResult
    }

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

    // Safety: only allow reposting known POST endpoints.
    if (record.method?.toUpperCase() !== 'POST') {
      return NextResponse.json({ success: false, error: 'Only POST requests can be reposted' }, { status: 400 })
    }

    const isDealEndpoint = record.endpoint?.includes('/external/api/deals')
    const isVendorEndpoint = record.endpoint?.includes('/external/api/vendors')

    if (!isDealEndpoint && !isVendorEndpoint) {
      return NextResponse.json({ success: false, error: 'Unsupported endpoint for repost' }, { status: 400 })
    }

    const result = isDealEndpoint
      ? await sendExternalDealPayload(record.requestBody as unknown as ExternalOfertaDealRequest, {
          endpoint: record.endpoint,
          bookingRequestId: record.bookingRequestId || undefined,
          userId: userId || undefined,
          triggeredBy: 'repost',
          resendOfLogId: record.id,
        })
      : await sendExternalVendorPayload(record.requestBody as unknown as ExternalOfertaVendorRequest, {
          endpoint: record.endpoint,
          userId: userId || undefined,
          triggeredBy: 'repost',
        })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error reposting external oferta request:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
