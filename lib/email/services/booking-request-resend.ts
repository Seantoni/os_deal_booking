import { resend, EMAIL_CONFIG } from '../config'
import { renderBookingRequestEmail } from '../templates/booking-request'
import { getAppBaseUrl } from '@/lib/config/env'
import { generateApprovalToken } from '@/lib/tokens'
import { buildCategoryDisplayString } from '@/lib/utils/category-display'
import { currentUser } from '@clerk/nextjs/server'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { generateBookingRequestPDF, generateBookingRequestPDFFilename } from '@/lib/pdf'
import { logger } from '@/lib/logger'

/**
 * Resend booking request email to the same business email
 * This utility can be used from anywhere in the application
 * 
 * @param bookingRequest - The booking request to resend
 * @returns Success status and any error message
 */
// Type for the booking request parameter.
// Uses an index signature so the full Prisma record can be forwarded as
// `bookingData` for the PDF (pricing options, business details, etc.).
interface BookingRequestForResend {
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
  additionalInfo?: {
    templateDisplayName?: string
    fields?: Record<string, string>
  } | null
  [key: string]: unknown
}

export async function resendBookingRequestEmail(bookingRequest: BookingRequestForResend) {
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
      additionalInfo: bookingRequest.additionalInfo || null,
      bookingData: bookingRequest as unknown as Record<string, unknown>,
      startDate: formatDateForEmail(bookingRequest.startDate),
      endDate: formatDateForEmail(bookingRequest.endDate),
      approveUrl,
      rejectUrl,
      requesterEmail: userEmail,
    })

    // Generate PDF summary for attachment
    let pdfBuffer: Buffer | null = null
    let pdfFilename: string | null = null
    try {
      logger.info('[ResendBookingRequest] Generating PDF summary')
      pdfBuffer = await generateBookingRequestPDF({
        requestName: bookingRequest.name,
        businessEmail: bookingRequest.businessEmail,
        merchant: bookingRequest.merchant || undefined,
        category: categoryString,
        parentCategory: bookingRequest.parentCategory || undefined,
        subCategory1: bookingRequest.subCategory1 || undefined,
        subCategory2: bookingRequest.subCategory2 || undefined,
        startDate: bookingRequest.startDate,
        endDate: bookingRequest.endDate,
        requesterEmail: userEmail,
        additionalInfo: bookingRequest.additionalInfo || null,
        bookingData: bookingRequest as unknown as Record<string, unknown>,
      })
      pdfFilename = generateBookingRequestPDFFilename(bookingRequest.name, bookingRequest.merchant || undefined)
      logger.info(`[ResendBookingRequest] PDF generated: ${pdfFilename} (${pdfBuffer.length} bytes)`)
    } catch (pdfError) {
      logger.error('[ResendBookingRequest] Error generating PDF, continuing without attachment:', pdfError)
      // Don't fail the resend if PDF generation fails - log and continue without attachment
    }

    // Send email to business (with CTAs)
    await resend.emails.send({
      from: `OfertaSimple <${EMAIL_CONFIG.from}>`,
      to: bookingRequest.businessEmail,
      replyTo: userEmail || EMAIL_CONFIG.replyTo,
      subject: `Solicitud de Reserva: ${bookingRequest.name}${bookingRequest.merchant ? ` (${bookingRequest.merchant})` : ''}`,
      html: emailHtml,
      attachments: pdfBuffer && pdfFilename ? [
        {
          filename: pdfFilename,
          content: pdfBuffer.toString('base64'),
        },
      ] : undefined,
    })
    
    // Send separate copy to requester without CTAs
    if (userEmail) {
      const requesterHtml = renderBookingRequestEmail({
        requestName: bookingRequest.name,
        businessEmail: bookingRequest.businessEmail,
        merchant: bookingRequest.merchant || undefined,
        category: categoryString,
        additionalInfo: bookingRequest.additionalInfo || null,
        bookingData: bookingRequest as unknown as Record<string, unknown>,
        startDate: formatDateForEmail(bookingRequest.startDate),
        endDate: formatDateForEmail(bookingRequest.endDate),
        approveUrl,
        rejectUrl,
        requesterEmail: userEmail,
        hideActions: true,
      })

      await resend.emails.send({
        from: `OfertaSimple <${EMAIL_CONFIG.from}>`,
        to: userEmail,
        replyTo: userEmail || EMAIL_CONFIG.replyTo,
        subject: `Copia de tu solicitud: ${bookingRequest.name}${bookingRequest.merchant ? ` (${bookingRequest.merchant})` : ''}`,
        html: requesterHtml,
        attachments: pdfBuffer && pdfFilename ? [
          {
            filename: pdfFilename,
            content: pdfBuffer.toString('base64'),
          },
        ] : undefined,
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
