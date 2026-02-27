import { resend, EMAIL_CONFIG } from '../config'
import { renderRejectionEmail } from '../templates/rejection'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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
    // Get the requester's email from UserProfile (user who created the request)
    let requesterEmail: string | null = null
    try {
      const userProfile = await prisma.userProfile.findUnique({
        where: { clerkId: bookingRequest.userId },
        select: { email: true },
      })
      requesterEmail = userProfile?.email || null
      
      // If not found in UserProfile, try to get from Clerk
      if (!requesterEmail) {
        const { clerkClient } = await import('@clerk/nextjs/server')
        const clerk = await clerkClient()
        const user = await clerk.users.getUser(bookingRequest.userId)
        requesterEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress 
          || user.emailAddresses[0]?.emailAddress 
          || null
      }
    } catch (userError) {
      console.error('Error getting requester email:', userError)
      // Continue without requester email - still send to business
    }

    // Create rejection email HTML
    const emailHtml = renderRejectionEmail({
      requestName: bookingRequest.name,
      merchant: bookingRequest.merchant || undefined,
      rejectionReason,
    })

    // Send email to business and requester (if found)
    const recipients = [bookingRequest.businessEmail]
    if (requesterEmail) {
      recipients.push(requesterEmail)
    }

    await resend.emails.send({
      from: `OfertaSimple <${EMAIL_CONFIG.from}>`,
      to: bookingRequest.businessEmail,
      cc: requesterEmail ? [requesterEmail] : [],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Solicitud de Reserva Rechazada: ${bookingRequest.name}`,
      html: emailHtml,
    })

    logger.info(`Rejection email sent to ${bookingRequest.businessEmail}${requesterEmail ? ` (CC: ${requesterEmail})` : ''}`)
  } catch (error) {
    console.error('Error sending rejection email:', error)
    throw error
  }
}
