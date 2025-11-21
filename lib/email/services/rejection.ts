import { resend, EMAIL_CONFIG } from '../config'
import { renderRejectionEmail } from '../templates/rejection'

/**
 * Send rejection email to business and requester
 */
export async function sendRejectionEmail(
  bookingRequest: {
    id: string
    name: string
    businessEmail: string
    merchant: string | null
    userId: string
  },
  rejectionReason: string
) {
  try {
    // Get the user's email from Clerk
    const { currentUser } = await import('@clerk/nextjs/server')
    const user = await currentUser()
    const requesterEmail = user?.emailAddresses?.[0]?.emailAddress

    // Create rejection email HTML
    const emailHtml = renderRejectionEmail({
      requestName: bookingRequest.name,
      merchant: bookingRequest.merchant || undefined,
      rejectionReason,
    })

    // Send email to business and CC to requester
    await resend.emails.send({
      from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
      to: bookingRequest.businessEmail,
      cc: requesterEmail ? [requesterEmail] : [],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Solicitud de Reserva Rechazada: ${bookingRequest.name}`,
      html: emailHtml,
    })

    console.log(`✓ Rejection email sent to ${bookingRequest.businessEmail}`)
  } catch (error) {
    console.error('Error sending rejection email:', error)
    throw error
  }
}

