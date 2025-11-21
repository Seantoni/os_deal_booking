import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Use Resend's test domain for development, or verified domain for production
// For testing: Use onboarding@resend.dev (works without domain verification)
// For production: Use your verified domain (jose.paez@ofertasimple.com)
const getFromEmail = () => {
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM
  }
  // Default to Resend's test domain for local development
  if (process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_APP_URL?.includes('vercel.app')) {
    return 'onboarding@resend.dev'
  }
  // Production: use verified domain
  return 'jose.paez@ofertasimple.com'
}

export const EMAIL_CONFIG = {
  from: getFromEmail(),
  replyTo: process.env.EMAIL_REPLY_TO || getFromEmail(),
}

export { resend }

/**
 * Send booking confirmation email to business and requester
 */
export async function sendBookingConfirmationEmail(
  event: {
    id: string
    name: string
    description: string | null
    category: string | null
    parentCategory: string | null
    subCategory1: string | null
    subCategory2: string | null
    merchant: string | null
    startDate: Date
    endDate: Date
  },
  businessEmail: string,
  requesterEmail?: string
) {
  try {
    // Format dates for email
    const formatDateForEmail = (date: Date) => {
      return new Date(date).toLocaleDateString('es-PA', {
        timeZone: 'America/Panama',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    // Build category display
    let categoryDisplay = ''
    if (event.parentCategory) {
      const parts = [event.parentCategory]
      if (event.subCategory1) parts.push(event.subCategory1)
      if (event.subCategory2) parts.push(event.subCategory2)
      categoryDisplay = parts.join(' > ')
    } else {
      categoryDisplay = event.category || ''
    }

    // Create booking confirmation email HTML
    const { renderBookedConfirmationEmail } = await import('@/lib/email-templates')
    const emailHtml = renderBookedConfirmationEmail({
      eventName: event.name,
      merchant: event.merchant || undefined,
      category: categoryDisplay || undefined,
      startDate: formatDateForEmail(event.startDate),
      endDate: formatDateForEmail(event.endDate),
      description: event.description || undefined,
    })

    // Send email to business and CC to requester
    const recipients = [businessEmail]
    const cc = requesterEmail ? [requesterEmail] : []

    await resend.emails.send({
      from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
      to: recipients,
      cc: cc,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Reserva Confirmada: ${event.name}`,
      html: emailHtml,
    })

    console.log(`✓ Booking confirmation email sent to ${businessEmail}`)
  } catch (error) {
    console.error('Error sending booking confirmation email:', error)
    throw error
  }
}

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
    const { renderRejectionEmail } = await import('@/lib/email-templates')
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

