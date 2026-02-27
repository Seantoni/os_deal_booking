import { resend, EMAIL_CONFIG } from '../config'
import { renderDealEditorAssignedEmail } from '../templates/deal-editor-assigned'
import { prisma } from '@/lib/prisma'
import { getAppBaseUrl } from '@/lib/config/env'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { logger } from '@/lib/logger'

/**
 * Send email to an editor when a deal is assigned.
 */
export async function sendDealEditorAssignedEmail(dealId: string, editorClerkId: string) {
  try {
    const [deal, editor] = await Promise.all([
      prisma.deal.findUnique({
        where: { id: dealId },
        select: {
          id: true,
          bookingRequest: {
            select: {
              id: true,
              name: true,
              merchant: true,
              category: true,
              parentCategory: true,
              subCategory1: true,
              subCategory2: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      }),
      prisma.userProfile.findUnique({
        where: { clerkId: editorClerkId },
        select: {
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      }),
    ])

    if (!deal?.bookingRequest) {
      logger.warn('Deal not found for editor assignment email', { dealId, editorClerkId })
      return
    }

    if (!editor || !editor.isActive || editor.role !== 'editor' || !editor.email) {
      logger.info('Skipping editor assignment email due to missing/invalid editor profile', {
        dealId,
        editorClerkId,
      })
      return
    }

    const event = await prisma.event.findFirst({
      where: {
        bookingRequestId: deal.bookingRequest.id,
        status: { in: ['booked', 'pre-booked'] },
      },
      orderBy: { updatedAt: 'desc' },
      select: { startDate: true, endDate: true },
    })

    const formatDateForEmail = (date: Date | null | undefined) => {
      if (!date) return undefined
      return new Date(date).toLocaleDateString('es-PA', {
        timeZone: PANAMA_TIMEZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    let categoryDisplay = ''
    if (deal.bookingRequest.parentCategory) {
      const parts = [deal.bookingRequest.parentCategory]
      if (deal.bookingRequest.subCategory1) parts.push(deal.bookingRequest.subCategory1)
      if (deal.bookingRequest.subCategory2) parts.push(deal.bookingRequest.subCategory2)
      categoryDisplay = parts.join(' > ')
    } else {
      categoryDisplay = deal.bookingRequest.category || ''
    }

    const startDate = event?.startDate || deal.bookingRequest.startDate
    const endDate = event?.endDate || deal.bookingRequest.endDate
    const dealUrl = `${getAppBaseUrl()}/deals?open=${deal.id}`

    const html = renderDealEditorAssignedEmail({
      editorName: editor.name || undefined,
      requestName: deal.bookingRequest.name,
      merchant: deal.bookingRequest.merchant || undefined,
      category: categoryDisplay || undefined,
      startDate: formatDateForEmail(startDate),
      endDate: formatDateForEmail(endDate),
      dealUrl,
    })

    await resend.emails.send({
      from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
      to: editor.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Nueva oferta asignada: ${deal.bookingRequest.name}`,
      html,
    })

    logger.info('Deal editor assignment email sent', {
      dealId,
      editorClerkId,
      recipient: editor.email,
    })
  } catch (error) {
    logger.error('Error sending deal editor assigned email:', error)
    throw error
  }
}
