/**
 * Booking Request PDF Generation
 * 
 * Generates PDF summaries of booking request data for email attachments.
 */

import type { BookingFormData } from '@/components/RequestForm/types'
import { generatePDFFromHTML } from './generate-pdf'
import { renderBookingRequestEmail } from '@/lib/email/templates/booking-request'
import { buildCategoryDisplayString } from '@/lib/utils/category-display'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { logger } from '@/lib/logger'

export interface BookingRequestPDFOptions {
  requestName: string
  businessEmail: string
  merchant?: string
  category?: string
  parentCategory?: string
  subCategory1?: string
  subCategory2?: string
  startDate: Date
  endDate: Date
  requesterEmail?: string
  additionalInfo?: {
    templateDisplayName?: string
    fields?: Record<string, string>
  } | null
  bookingData: Partial<BookingFormData> | Record<string, unknown>
}

/**
 * Generate PDF summary of booking request data
 * 
 * @param options - Booking request data and options
 * @returns Buffer containing the PDF data
 */
export async function generateBookingRequestPDF(
  options: BookingRequestPDFOptions
): Promise<Buffer> {
  try {
    logger.info('[BookingRequestPDF] Generating PDF for booking request:', options.requestName)
    
    // Format dates for display (Panama timezone)
    const formatDateForPDF = (date: Date) => {
      return new Date(date).toLocaleDateString('es-PA', {
        timeZone: PANAMA_TIMEZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
    
    // Build category string
    const categoryString = buildCategoryDisplayString(
      options.parentCategory || null,
      options.subCategory1 || null,
      options.subCategory2 || null,
      undefined, // subCategory3
      undefined, // subCategory4
      options.category || null // fallbackCategory
    )
    
    // Generate HTML for PDF (hide action buttons since this is a summary document)
    const html = renderBookingRequestEmail({
      requestName: options.requestName,
      businessEmail: options.businessEmail,
      merchant: options.merchant,
      category: categoryString,
      additionalInfo: options.additionalInfo,
      bookingData: options.bookingData,
      startDate: formatDateForPDF(options.startDate),
      endDate: formatDateForPDF(options.endDate),
      approveUrl: '', // Not needed for PDF
      rejectUrl: '', // Not needed for PDF
      requesterEmail: options.requesterEmail,
      hideActions: true, // Hide action buttons in PDF
    })
    
    // Generate PDF from HTML
    const pdfBuffer = await generatePDFFromHTML(html, {
      format: 'A4',
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
      printBackground: true,
      displayHeaderFooter: false,
    })
    
    logger.info(`[BookingRequestPDF] PDF generated successfully (${pdfBuffer.length} bytes)`)
    
    return pdfBuffer
  } catch (error) {
    logger.error('[BookingRequestPDF] Error generating PDF:', error)
    throw new Error(
      `Failed to generate booking request PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate PDF filename for booking request
 * 
 * @param requestName - Name of the booking request
 * @param merchant - Optional merchant name
 * @returns Sanitized filename
 */
export function generateBookingRequestPDFFilename(
  requestName: string,
  merchant?: string
): string {
  // Sanitize filename: remove special characters, replace spaces with underscores
  const sanitize = (str: string) => {
    return str
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase()
      .substring(0, 50) // Limit length
  }
  
  const namePart = sanitize(requestName)
  const merchantPart = merchant ? `_${sanitize(merchant)}` : ''
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  
  return `solicitud_reserva_${namePart}${merchantPart}_${timestamp}.pdf`
}
