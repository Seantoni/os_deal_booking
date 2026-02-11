import { resend, EMAIL_CONFIG } from '../config'
import { renderDealAssignmentReadyEmail } from '../templates/deal-assignment-ready'
import { prisma } from '@/lib/prisma'
import { getAppBaseUrl } from '@/lib/config/env'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { logger } from '@/lib/logger'

type BookingRequestForAssignmentEmail = {
  id: string
  name: string
  merchant: string | null
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  startDate: Date
  endDate: Date
}

/**
 * Send deal assignment notification email to senior editors
 */
export async function sendDealAssignmentReadyEmail(bookingRequestId: string) {
  try {
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
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
    }) as BookingRequestForAssignmentEmail | null

    if (!bookingRequest) {
      logger.warn('Booking request not found for assignment email', { bookingRequestId })
      return
    }

    const seniorEditors = await prisma.userProfile.findMany({
      where: {
        role: 'editor_senior',
        isActive: true,
        email: { not: null },
      },
      select: { email: true },
    })

    const recipients = seniorEditors
      .map((user) => user.email)
      .filter((email): email is string => Boolean(email))

    if (recipients.length === 0) {
      logger.info('No active senior editor emails found for assignment notification', {
        bookingRequestId,
      })
      return
    }

    const event = await prisma.event.findFirst({
      where: {
        bookingRequestId,
        status: { in: ['booked', 'pre-booked'] },
      },
      orderBy: { updatedAt: 'desc' },
      select: { startDate: true, endDate: true },
    })

    const formatDateForEmail = (date: Date) =>
      new Date(date).toLocaleDateString('es-PA', {
        timeZone: PANAMA_TIMEZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

    const startDate = event?.startDate || bookingRequest.startDate
    const endDate = event?.endDate || bookingRequest.endDate

    let categoryDisplay = ''
    if (bookingRequest.parentCategory) {
      const parts = [bookingRequest.parentCategory]
      if (bookingRequest.subCategory1) parts.push(bookingRequest.subCategory1)
      if (bookingRequest.subCategory2) parts.push(bookingRequest.subCategory2)
      categoryDisplay = parts.join(' > ')
    } else {
      categoryDisplay = bookingRequest.category || ''
    }

    const assignmentsUrl = `${getAppBaseUrl()}/deals?tab=assignments`

    const emailHtml = renderDealAssignmentReadyEmail({
      requestName: bookingRequest.name,
      merchant: bookingRequest.merchant || undefined,
      category: categoryDisplay || undefined,
      startDate: startDate ? formatDateForEmail(startDate) : undefined,
      endDate: endDate ? formatDateForEmail(endDate) : undefined,
      assignmentsUrl,
    })

    await resend.emails.send({
      from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
      to: recipients,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Deal listo para asignar: ${bookingRequest.name}`,
      html: emailHtml,
    })

    logger.info(`Deal assignment email sent for booking request ${bookingRequestId}`, {
      recipients: recipients.length,
    })
  } catch (error) {
    logger.error('Error sending deal assignment ready email:', error)
    throw error
  }
}
