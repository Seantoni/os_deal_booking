import { NextRequest, NextResponse } from 'next/server'
import { getAppBaseUrl } from '@/lib/config/env'
import { verifyVendorReactivationToken } from '@/lib/tokens'
import { applyPublicRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { createVendorReactivationBookingRequest } from '@/lib/vendor-reactivation/service'
import { sendVendorReactivationRequestNotification } from '@/lib/email/services/vendor-reactivation'
import { logger } from '@/lib/logger'

function getBaseUrl(request: NextRequest): string {
  try {
    return getAppBaseUrl()
  } catch {
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    return `${protocol}://${host}`
  }
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await applyPublicRateLimit(
    request,
    'Demasiadas solicitudes. Por favor espera un momento.'
  )
  if (rateLimitResult) return rateLimitResult

  const baseUrl = getBaseUrl(request)
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=Missing token`))
  }

  const verification = verifyVendorReactivationToken(token)
  if (!verification.valid || !verification.businessId || !verification.externalDealId) {
    const message = encodeURIComponent(verification.error || 'Invalid token')
    return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=${message}`))
  }

  const result = await createVendorReactivationBookingRequest({
    businessId: verification.businessId,
    externalDealId: verification.externalDealId,
    triggeredBy: 'public_link',
  })

  if (!result.success) {
    const message = encodeURIComponent(result.error)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=${message}`))
  }

  if (!result.duplicate) {
    try {
      const requestDetails = await prisma.bookingRequest.findUnique({
        where: { id: result.requestId },
        select: {
          id: true,
          name: true,
          userId: true,
          originExternalDealId: true,
          originExternalDealName: true,
          business: {
            select: {
              name: true,
              ownerId: true,
            },
          },
        },
      })

      if (requestDetails?.business) {
        const recipientProfiles = requestDetails.business.ownerId
          ? await prisma.userProfile.findMany({
              where: { clerkId: requestDetails.business.ownerId },
              select: { email: true },
            })
          : await prisma.userProfile.findMany({
              where: { role: 'admin' },
              select: { email: true },
            })

        const recipientEmails = recipientProfiles
          .map((profile) => profile.email)
          .filter((email): email is string => Boolean(email))

        if (recipientEmails.length > 0) {
          await sendVendorReactivationRequestNotification({
            recipientEmails,
            businessName: requestDetails.business.name,
            requestName: requestDetails.name,
            requestUrl: `${baseUrl}/booking-requests?tab=reactivations&view=${encodeURIComponent(requestDetails.id)}`,
            externalDealId: requestDetails.originExternalDealId || verification.externalDealId,
            externalDealName: requestDetails.originExternalDealName,
          })
        }
      }
    } catch (notificationError) {
      logger.error('[vendor-reactivation] Failed to send internal notification', notificationError)
    }
  }

  const successParams = new URLSearchParams({
    id: result.requestId,
  })
  if (result.duplicate) {
    successParams.set('duplicate', 'true')
  }

  return NextResponse.redirect(new URL(`${baseUrl}/vendor-reactivation/success?${successParams.toString()}`))
}
