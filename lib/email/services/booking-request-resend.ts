import { resend, EMAIL_CONFIG } from '../config'
import { renderBookingRequestEmail } from '../templates/booking-request'
import { getAppBaseUrl } from '@/lib/config/env'
import { generateApprovalToken } from '@/lib/tokens'
import { buildCategoryDisplayString } from '@/lib/utils/category-display'
import { currentUser } from '@clerk/nextjs/server'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'

/**
 * Resend booking request email to the same business email
 * This utility can be used from anywhere in the application
 * 
 * @param bookingRequest - The booking request to resend
 * @returns Success status and any error message
 */
export async function resendBookingRequestEmail(bookingRequest: {
  id: string
  name: string
  businessEmail: string
  merchant: string | null
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  startDate: Date
  endDate: Date
  userId: string
}) {
  try {
    // Get user information for email
    const user = await currentUser()
    const userEmail = user?.emailAddresses[0]?.emailAddress

    // Generate new secure tokens for approve/reject actions
    const approveToken = generateApprovalToken(bookingRequest.id, 'approve')
    const rejectToken = generateApprovalToken(bookingRequest.id, 'reject')

    // Build approval URLs (use absolute URL for email)
    const baseUrl = getAppBaseUrl()
    const approveUrl = `${baseUrl}/api/booking-requests/approve?token=${approveToken}`
    const rejectUrl = `${baseUrl}/api/booking-requests/reject?token=${rejectToken}`

    // Format dates for email in Panama timezone
    const formatDateForEmail = (date: Date) => {
      return new Date(date).toLocaleDateString('es-PA', {
        timeZone: PANAMA_TIMEZONE, // Panama EST (UTC-5)
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    // Build category string using utility
    const categoryString = buildCategoryDisplayString(
      bookingRequest.parentCategory,
      bookingRequest.subCategory1,
      bookingRequest.subCategory2,
      bookingRequest.category
    )

    // Generate email HTML
    const emailHtml = renderBookingRequestEmail({
      requestName: bookingRequest.name,
      businessEmail: bookingRequest.businessEmail,
      merchant: bookingRequest.merchant || undefined,
      category: categoryString,
      additionalInfo: (bookingRequest as any).additionalInfo || null,
      bookingData: bookingRequest as any,
      startDate: formatDateForEmail(bookingRequest.startDate),
      endDate: formatDateForEmail(bookingRequest.endDate),
      approveUrl,
      rejectUrl,
      requesterEmail: userEmail,
    })

    // Send email to business (with CTAs)
    await resend.emails.send({
      from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
      to: bookingRequest.businessEmail,
      replyTo: userEmail || EMAIL_CONFIG.replyTo,
      subject: `Solicitud de Reserva: ${bookingRequest.name}${bookingRequest.merchant ? ` (${bookingRequest.merchant})` : ''}`,
      html: emailHtml,
    })
    
    // Send separate copy to requester without CTAs
    if (userEmail) {
      const requesterHtml = renderBookingRequestEmail({
        requestName: bookingRequest.name,
        businessEmail: bookingRequest.businessEmail,
        merchant: bookingRequest.merchant || undefined,
        category: categoryString,
        additionalInfo: (bookingRequest as any).additionalInfo || null,
        bookingData: bookingRequest as any,
        startDate: formatDateForEmail(bookingRequest.startDate),
        endDate: formatDateForEmail(bookingRequest.endDate),
        approveUrl,
        rejectUrl,
        requesterEmail: userEmail,
        hideActions: true,
      })

      await resend.emails.send({
        from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
        to: userEmail,
        replyTo: userEmail || EMAIL_CONFIG.replyTo,
        subject: `Copia de tu solicitud: ${bookingRequest.name}${bookingRequest.merchant ? ` (${bookingRequest.merchant})` : ''}`,
        html: requesterHtml,
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error resending booking request email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to resend email' 
    }
  }
}

