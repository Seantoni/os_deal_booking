import { resend, EMAIL_CONFIG } from '../config'
import { renderBookingConfirmationEmail } from '../templates/booking-confirmation'

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
    const emailHtml = renderBookingConfirmationEmail({
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

