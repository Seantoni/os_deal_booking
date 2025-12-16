'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError, buildRoleBasedWhereClause } from '@/lib/utils/server-actions'
import { invalidateEntity, invalidateEntities } from '@/lib/cache'
import { getUserRole } from '@/lib/auth/roles'
import { resend, EMAIL_CONFIG } from '@/lib/email/config'
import { renderBookingRequestEmail } from '@/lib/email/templates/booking-request'
import { resendBookingRequestEmail } from '@/lib/email/services/booking-request-resend'
import { generateApprovalToken } from '@/lib/tokens'
import type { BookingRequestStatus, BookingRequest } from '@/types'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { extractBookingRequestFromFormData } from '@/lib/utils/form-data'
import { isValidEmail, validateDateRange, validateRequiredFields } from '@/lib/utils/validation'
import { buildCategoryDisplayString } from '@/lib/utils/category-display'
import { logger } from '@/lib/logger'
import { getAppBaseUrl } from '@/lib/config/env'
import { parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'
import { buildCategoryKey } from '@/lib/category-utils'
import { logActivity } from '@/lib/activity-log'
import { generateRequestName, countBusinessRequests } from '@/lib/utils/request-naming'

/**
 * Create or update a booking request as draft
 */
export async function saveBookingRequestDraft(formData: FormData, requestId?: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Extract all fields using utility
    const fields = extractBookingRequestFromFormData(formData)

    // Validate required fields
    const missing = validateRequiredFields(fields, ['name', 'businessEmail', 'startDate', 'endDate'])
    if (missing.length > 0) {
      return { 
        success: false, 
        error: `Missing required fields: ${missing.join(', ')}` 
      }
    }

    // Validate email format
    if (!isValidEmail(fields.businessEmail!)) {
      return { success: false, error: 'Invalid email format' }
    }

    // Parse dates in Panama timezone for consistency
    const startDateTime = parseDateInPanamaTime(fields.startDate!)
    const endDateTime = parseEndDateInPanamaTime(fields.endDate!)

    // Validate date range
    const dateValidation = validateDateRange(startDateTime, endDateTime)
    if (!dateValidation.valid) {
      return { success: false, error: dateValidation.error! }
    }

    // Store additional emails as JSON array
    const additionalEmailsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      fields.additionalEmails &&
      Array.isArray(fields.additionalEmails) &&
      fields.additionalEmails.length > 0
        ? (fields.additionalEmails.filter(
            (email: string) => email && email.trim() && email.includes('@')
          ) as Prisma.InputJsonValue)
        : Prisma.JsonNull

    // Generate request name with format: "Business Name | Dec-15-2025 | #3"
    // Only generate new name for new requests, preserve existing name on updates
    let requestName = fields.name!
    if (!requestId) {
      const existingCount = await countBusinessRequests(fields.name!)
      requestName = generateRequestName(fields.name!, existingCount)
    }

    const data = {
      name: requestName,
      category: fields.category,
      parentCategory: fields.parentCategory,
      subCategory1: fields.subCategory1,
      subCategory2: fields.subCategory2,
      subCategory3: fields.subCategory3,
      merchant: fields.merchant,
      businessEmail: fields.businessEmail!,
      additionalEmails: additionalEmailsJson,
      startDate: startDateTime,
      endDate: endDateTime,
      status: 'draft' as BookingRequestStatus,
      opportunityId: fields.opportunityId || null,
      userId,
      // Configuración: Configuración General y Vigencia
      campaignDuration: fields.campaignDuration,
      // Operatividad: Operatividad y Pagos
      redemptionMode: fields.redemptionMode,
      isRecurring: fields.isRecurring,
      recurringOfferLink: fields.recurringOfferLink,
      paymentType: fields.paymentType,
      paymentInstructions: fields.paymentInstructions,
      // Directorio: Directorio de Responsables
      redemptionContactName: fields.redemptionContactName,
      redemptionContactEmail: fields.redemptionContactEmail,
      redemptionContactPhone: fields.redemptionContactPhone,
      // Fiscales: Datos Fiscales, Bancarios y de Ubicación
      legalName: fields.legalName,
      rucDv: fields.rucDv,
      bankAccountName: fields.bankAccountName,
      bank: fields.bank,
      accountNumber: fields.accountNumber,
      accountType: fields.accountType,
      addressAndHours: fields.addressAndHours,
      province: fields.province,
      district: fields.district,
      corregimiento: fields.corregimiento,
      // Negocio: Reglas de Negocio y Restricciones
      includesTaxes: fields.includesTaxes,
      validOnHolidays: fields.validOnHolidays,
      hasExclusivity: fields.hasExclusivity,
      blackoutDates: fields.blackoutDates,
      exclusivityCondition: fields.exclusivityCondition,
      giftVouchers: fields.giftVouchers,
      hasOtherBranches: fields.hasOtherBranches,
      vouchersPerPerson: fields.vouchersPerPerson,
      commission: fields.commission,
      // Descripción: Descripción y Canales de Venta
      redemptionMethods: fields.redemptionMethods,
      contactDetails: fields.contactDetails,
      socialMedia: fields.socialMedia,
      businessReview: fields.businessReview,
      offerDetails: fields.offerDetails,
      // Estructura: Estructura de la Oferta
      pricingOptions: fields.pricingOptions,
      // Políticas: Políticas Generales
      cancellationPolicy: fields.cancellationPolicy,
      marketValidation: fields.marketValidation,
      additionalComments: fields.additionalComments,
      // Información Adicional (Dynamic template-based)
      additionalInfo: fields.additionalInfo || undefined,
    }

    let bookingRequest
    if (requestId) {
      // Update existing draft
      bookingRequest = await prisma.bookingRequest.update({
        where: { id: requestId, userId },
        data,
      })
    } else {
      // Create new draft
      bookingRequest = await prisma.bookingRequest.create({
        data,
      })
      
      // If created from an opportunity, mark the opportunity as having a request and link it
      if (fields.opportunityId) {
        await prisma.opportunity.update({
          where: { id: fields.opportunityId },
          data: { 
            hasRequest: true,
            bookingRequestId: bookingRequest.id,
          },
        })
        invalidateEntity('opportunities')
      }
    }

    invalidateEntity('booking-requests')
    return { success: true, data: bookingRequest }
  } catch (error) {
    return handleServerActionError(error, 'saveBookingRequestDraft')
  }
}

/**
 * Send a booking request (changes status to pending)
 */
export async function sendBookingRequest(formData: FormData, requestId?: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const parentCategory = formData.get('parentCategory') as string
    const subCategory1 = formData.get('subCategory1') as string
    const subCategory2 = formData.get('subCategory2') as string
    const subCategory3 = formData.get('subCategory3') as string
    const merchant = formData.get('merchant') as string
    const businessEmail = formData.get('businessEmail') as string
    const additionalEmailsStr = formData.get('additionalEmails') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    
    // Parse additional emails from formData, or use stored emails from draft
    let additionalEmails: string[] = []
    
    // First, try to get from formData
    try {
      if (additionalEmailsStr) {
        additionalEmails = JSON.parse(additionalEmailsStr)
      }
    } catch (e) {
      logger.error('Error parsing additionalEmails from formData:', e)
    }
    
    // If no emails in formData and we're updating an existing request, try to get from database
    if (additionalEmails.length === 0 && requestId) {
      try {
        const existingRequest = await prisma.bookingRequest.findUnique({
          where: { id: requestId },
        })
        // Type assertion: Prisma types may need IDE restart to fully update
        const storedEmails = (existingRequest as any)?.additionalEmails
        if (storedEmails && Array.isArray(storedEmails)) {
          additionalEmails = storedEmails as string[]
        }
      } catch (e) {
        logger.error('Error loading additionalEmails from database:', e)
      }
    }

    // Validation
    if (!name || !businessEmail || !startDate || !endDate) {
      return { 
        success: false, 
        error: 'Missing required fields: name, businessEmail, startDate, endDate' 
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(businessEmail)) {
      return { success: false, error: 'Invalid email format' }
    }

    // Parse dates in Panama timezone for consistency
    const startDateTime = parseDateInPanamaTime(startDate)
    const endDateTime = parseEndDateInPanamaTime(endDate)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { success: false, error: 'Invalid date format' }
    }

    if (endDateTime < startDateTime) {
      return { success: false, error: 'End date must be after start date' }
    }

    // Parse JSON fields
    const redemptionMethodsStr = formData.get('redemptionMethods') as string
    const pricingOptionsStr = formData.get('pricingOptions') as string
    const additionalInfoStr = formData.get('additionalInfo') as string
    let redemptionMethods = null
    let pricingOptions = null
    let additionalInfo = null
    
    try {
      if (redemptionMethodsStr) {
        redemptionMethods = JSON.parse(redemptionMethodsStr)
      }
      if (pricingOptionsStr) {
        pricingOptions = JSON.parse(pricingOptionsStr)
      }
      if (additionalInfoStr) {
        additionalInfo = JSON.parse(additionalInfoStr)
      }
    } catch (e) {
      logger.error('Error parsing JSON fields:', e)
    }

    const opportunityId = (formData.get('opportunityId') as string) || null
    
    // Generate request name with format: "Business Name | Dec-15-2025 | #3"
    // Only generate new name for new requests, preserve existing name on updates
    let requestName = name
    if (!requestId) {
      const existingCount = await countBusinessRequests(name)
      requestName = generateRequestName(name, existingCount)
    }
    
    const data = {
      name: requestName,
      category: category || null,
      parentCategory: parentCategory || null,
      subCategory1: subCategory1 || null,
      subCategory2: subCategory2 || null,
      subCategory3: subCategory3 || null,
      merchant: merchant || null,
      businessEmail,
      startDate: startDateTime,
      endDate: endDateTime,
      status: 'pending' as BookingRequestStatus,
      opportunityId,
      userId,
      // Configuración: Configuración General y Vigencia
      campaignDuration: (formData.get('campaignDuration') as string) || null,
      // Operatividad: Operatividad y Pagos
      redemptionMode: (formData.get('redemptionMode') as string) || null,
      isRecurring: (formData.get('isRecurring') as string) || null,
      recurringOfferLink: (formData.get('recurringOfferLink') as string) || null,
      paymentType: (formData.get('paymentType') as string) || null,
      paymentInstructions: (formData.get('paymentInstructions') as string) || null,
      // Directorio: Directorio de Responsables
      redemptionContactName: (formData.get('redemptionContactName') as string) || null,
      redemptionContactEmail: (formData.get('redemptionContactEmail') as string) || null,
      redemptionContactPhone: (formData.get('redemptionContactPhone') as string) || null,
      // Fiscales: Datos Fiscales, Bancarios y de Ubicación
      legalName: (formData.get('legalName') as string) || null,
      rucDv: (formData.get('rucDv') as string) || null,
      bankAccountName: (formData.get('bankAccountName') as string) || null,
      bank: (formData.get('bank') as string) || null,
      accountNumber: (formData.get('accountNumber') as string) || null,
      accountType: (formData.get('accountType') as string) || null,
      addressAndHours: (formData.get('addressAndHours') as string) || null,
      province: (formData.get('province') as string) || null,
      district: (formData.get('district') as string) || null,
      corregimiento: (formData.get('corregimiento') as string) || null,
      // Negocio: Reglas de Negocio y Restricciones
      includesTaxes: (formData.get('includesTaxes') as string) || null,
      validOnHolidays: (formData.get('validOnHolidays') as string) || null,
      hasExclusivity: (formData.get('hasExclusivity') as string) || null,
      blackoutDates: (formData.get('blackoutDates') as string) || null,
      exclusivityCondition: (formData.get('exclusivityCondition') as string) || null,
      giftVouchers: (formData.get('giftVouchers') as string) || null,
      hasOtherBranches: (formData.get('hasOtherBranches') as string) || null,
      vouchersPerPerson: (formData.get('vouchersPerPerson') as string) || null,
      commission: (formData.get('commission') as string) || null,
      // Descripción: Descripción y Canales de Venta
      redemptionMethods,
      contactDetails: (formData.get('contactDetails') as string) || null,
      socialMedia: (formData.get('socialMedia') as string) || null,
      businessReview: (formData.get('businessReview') as string) || null,
      offerDetails: (formData.get('offerDetails') as string) || null,
      // Estructura: Estructura de la Oferta
      pricingOptions,
      // Políticas: Políticas Generales
      cancellationPolicy: (formData.get('cancellationPolicy') as string) || null,
      marketValidation: (formData.get('marketValidation') as string) || null,
      additionalComments: (formData.get('additionalComments') as string) || null,
      // Información Adicional (Dynamic template-based)
      additionalInfo,
    }

    let bookingRequest
    let event
    
    // Create or update the booking request
    if (requestId) {
      // Update existing request and set to pending
      bookingRequest = await prisma.bookingRequest.update({
        where: { id: requestId, userId },
        data,
      })
    } else {
      // Create new request with pending status
      bookingRequest = await prisma.bookingRequest.create({
        data,
      })
      
      // If created from an opportunity, mark the opportunity as having a request and link it
      if (opportunityId) {
        await prisma.opportunity.update({
          where: { id: opportunityId },
          data: { 
            hasRequest: true,
            bookingRequestId: bookingRequest.id,
          },
        })
        invalidateEntity('opportunities')
      }
    }

    // Build standardized category key for consistent matching
    const { buildCategoryKey } = await import('@/lib/category-utils')
    const standardizedCategory = buildCategoryKey(
      data.parentCategory,
      data.subCategory1,
      data.subCategory2,
      null, // subCategory3
      data.category
    )

    // Create a pending event in the calendar
    if (bookingRequest.eventId) {
      // Update existing event
      event = await prisma.event.update({
        where: { id: bookingRequest.eventId },
        data: {
          name: data.name!,
          description: null, // BookingRequest no longer has description
          category: standardizedCategory, // Store standardized key in category field
          parentCategory: data.parentCategory,
          subCategory1: data.subCategory1,
          subCategory2: data.subCategory2,
          merchant: data.merchant,
          startDate: startDateTime,
          endDate: endDateTime,
          status: 'pending',
          userId,
          bookingRequestId: bookingRequest.id,
        },
      })
    } else {
      // Create new event with pending status
      event = await prisma.event.create({
        data: {
          name: data.name!,
          description: null, // BookingRequest no longer has description
          category: standardizedCategory, // Store standardized key in category field
          parentCategory: data.parentCategory,
          subCategory1: data.subCategory1,
          subCategory2: data.subCategory2,
          merchant: data.merchant,
          startDate: startDateTime,
          endDate: endDateTime,
          status: 'pending',
          userId,
          bookingRequestId: bookingRequest.id,
        },
      })
      
      // Link the event to the booking request
      bookingRequest = await prisma.bookingRequest.update({
        where: { id: bookingRequest.id },
        data: { eventId: event.id },
      })
    }

    // Get user information for email
    const user = await currentUser()
    const userEmail = user?.emailAddresses[0]?.emailAddress

    // Generate secure tokens for approve/reject actions
    const approveToken = generateApprovalToken(bookingRequest.id, 'approve')
    const rejectToken = generateApprovalToken(bookingRequest.id, 'reject')

    // Build approval URLs (use absolute URL for email)
    const baseUrl = getAppBaseUrl()
    const approveUrl = `${baseUrl}/api/booking-requests/approve?token=${approveToken}`
    const rejectUrl = `${baseUrl}/api/booking-requests/reject?token=${rejectToken}`

    // Format dates for email in Panama timezone
    const formatDateForEmail = (date: Date) => {
      return new Date(date).toLocaleDateString('es-PA', {
        timeZone: 'America/Panama', // Panama EST (UTC-5)
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    // Build category string using utility
    const categoryString = buildCategoryDisplayString(
      data.parentCategory,
      data.subCategory1,
      data.subCategory2,
      data.category
    )

    // Generate email HTML (for business recipients)
    const emailHtml = renderBookingRequestEmail({
      requestName: data.name!,
      businessEmail: data.businessEmail!,
      merchant: data.merchant || undefined,
      category: categoryString,
      additionalInfo: (data as any).additionalInfo || null,
      bookingData: data as any,
      startDate: formatDateForEmail(startDateTime),
      endDate: formatDateForEmail(endDateTime),
      approveUrl,
      rejectUrl,
      requesterEmail: userEmail,
    })

    // Build list of all business recipients (primary + additional)
    const allRecipients = [businessEmail, ...additionalEmails.filter(e => e && e.trim())]
    const uniqueRecipients = [...new Set(allRecipients)]
    
    // Send email to business recipients (with CTAs)
    try {
      if (uniqueRecipients.length > 0) {
        await resend.emails.send({
          from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
          to: uniqueRecipients,
          replyTo: userEmail || EMAIL_CONFIG.replyTo,
          subject: `Solicitud de Reserva: ${name}${merchant ? ` (${merchant})` : ''}`,
          html: emailHtml,
        })
        logger.info(`Email sent to ${uniqueRecipients.join(', ')}`)
      }

      // Send separate copy to requester without CTAs
      if (userEmail) {
        const requesterHtml = renderBookingRequestEmail({
          requestName: data.name!,
          businessEmail: data.businessEmail!,
          merchant: data.merchant || undefined,
          category: categoryString,
          additionalInfo: (data as any).additionalInfo || null,
          bookingData: data as any,
          startDate: formatDateForEmail(startDateTime),
          endDate: formatDateForEmail(endDateTime),
          approveUrl,
          rejectUrl,
          requesterEmail: userEmail,
          hideActions: true,
        })

        await resend.emails.send({
          from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
          to: [userEmail],
          replyTo: userEmail || EMAIL_CONFIG.replyTo,
          subject: `Copia de tu solicitud: ${name}${merchant ? ` (${merchant})` : ''}`,
          html: requesterHtml,
        })
        logger.info(`Requester copy sent to ${userEmail}`)
      }
    } catch (emailError) {
      logger.error('Error sending email:', emailError)
      // Don't fail the request if email fails - log and continue
      // The request is still created, just email failed
    }

    // Log activity
    await logActivity({
      action: requestId ? 'SEND' : 'CREATE',
      entityType: 'BookingRequest',
      entityId: bookingRequest.id,
      entityName: bookingRequest.name,
    })

    invalidateEntity('booking-requests')
    return { success: true, data: bookingRequest }
  } catch (error) {
    return handleServerActionError(error, 'sendBookingRequest')
  }
}

/**
 * Get booking requests based on user role
 * - Admin: sees all requests
 * - Sales: sees only their own requests
 */
export async function getBookingRequests() {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const role = await getUserRole()
    const cacheKey = `booking-requests-${userId}-${role}`

    const getCachedRequests = unstable_cache(
      async () => {
        if (role === 'admin') {
          // Admin sees all requests
          return await prisma.bookingRequest.findMany({
            orderBy: { createdAt: 'desc' },
          })
        } else if (role === 'sales') {
          // Sales sees only their own requests
          return await prisma.bookingRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
          })
        } else {
          // Editor doesn't have access to booking requests
          return await prisma.bookingRequest.findMany({
            where: { id: 'never-match' }, // This will return empty array
            orderBy: { createdAt: 'desc' },
          })
        }
      },
      [cacheKey],
      {
        tags: ['booking-requests'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const requests = await getCachedRequests()
    return { success: true, data: requests }
  } catch (error) {
    return handleServerActionError(error, 'getBookingRequests')
  }
}

/**
 * Refresh booking requests data without full page refresh
 * This avoids Clerk API calls on booking request updates
 */
export async function refreshBookingRequests(): Promise<{
  success: boolean
  data?: BookingRequest[]
  error?: string
}> {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const role = await getUserRole()

    // Fetch directly from database (bypass cache for fresh data)
    let requests: BookingRequest[]
    if (role === 'admin') {
      requests = await prisma.bookingRequest.findMany({
        orderBy: { createdAt: 'desc' },
      }) as BookingRequest[]
    } else if (role === 'sales') {
      requests = await prisma.bookingRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }) as BookingRequest[]
    } else {
      requests = []
    }

    return { success: true, data: requests }
  } catch (error) {
    return handleServerActionError(error, 'refreshBookingRequests')
  }
}

/**
 * Get booking requests by business ID
 * Fetches all requests linked to a business through:
 * 1. Opportunities (opportunityId → opportunity.businessId)
 * 2. Merchant name matching (for requests created directly without an opportunity)
 */
export async function getRequestsByBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Get business name for merchant matching
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    // Get all opportunities for this business
    const opportunities = await prisma.opportunity.findMany({
      where: { businessId },
      select: { id: true },
    })

    const opportunityIds = opportunities.map(o => o.id)

    // Get all booking requests linked via opportunity OR matching by merchant name
    const requests = await prisma.bookingRequest.findMany({
      where: {
        OR: [
          // Requests linked through opportunities
          ...(opportunityIds.length > 0 ? [{ opportunityId: { in: opportunityIds } }] : []),
          // Requests matching by merchant name (case-insensitive)
          { merchant: { equals: business.name, mode: 'insensitive' as const } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })

    // Deduplicate (in case a request matches both criteria)
    const uniqueRequests = Array.from(
      new Map(requests.map(r => [r.id, r])).values()
    )

    return { success: true, data: uniqueRequests }
  } catch (error) {
    return handleServerActionError(error, 'getRequestsByBusiness')
  }
}

/**
 * Get a booking request by opportunity ID
 */
export async function getBookingRequestByOpportunityId(opportunityId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const bookingRequest = await prisma.bookingRequest.findFirst({
      where: { opportunityId },
      orderBy: { createdAt: 'desc' },
    })

    if (!bookingRequest) {
      return { success: false, error: 'Booking request not found' }
    }

    return { success: true, data: bookingRequest }
  } catch (error) {
    return handleServerActionError(error, 'getBookingRequestByOpportunityId')
  }
}

/**
 * Get a single booking request by ID
 */
export async function getBookingRequest(requestId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const role = await getUserRole()
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
    })

    if (!bookingRequest) {
      return { success: false, error: 'Booking request not found' }
    }

    // Sales users can only see their own requests
    if (role === 'sales' && bookingRequest.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Fetch user profiles for processedBy and userId (creator)
    let processedByUser = null
    let createdByUser = null

    if (bookingRequest.processedBy) {
      processedByUser = await prisma.userProfile.findUnique({
        where: { clerkId: bookingRequest.processedBy },
        select: { name: true, email: true },
      })
    }

    if (bookingRequest.userId) {
      createdByUser = await prisma.userProfile.findUnique({
        where: { clerkId: bookingRequest.userId },
        select: { name: true, email: true },
      })
    }

    return { 
      success: true, 
      data: {
        ...bookingRequest,
        processedByUser,
        createdByUser,
      }
    }
  } catch (error) {
    return handleServerActionError(error, 'getBookingRequest')
  }
}

/**
 * Delete a booking request
 */
export async function deleteBookingRequest(requestId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Only admins can delete booking requests
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get booking request info for logging
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      select: { name: true },
    })
    
    await prisma.bookingRequest.delete({
      where: { 
        id: requestId,
      },
    })

    // Log activity
    await logActivity({
      action: 'DELETE',
      entityType: 'BookingRequest',
      entityId: requestId,
      entityName: request?.name || undefined,
    })

    invalidateEntity('booking-requests')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteBookingRequest')
  }
}

/**
 * Update a booking request (dates, category, etc.)
 */
export async function updateBookingRequest(requestId: string, formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Extract all fields using utility
    const fields = extractBookingRequestFromFormData(formData)

    // Parse dates in Panama timezone for consistency
    const startDateTime = fields.startDate ? parseDateInPanamaTime(fields.startDate) : null
    const endDateTime = fields.endDate ? parseEndDateInPanamaTime(fields.endDate) : null

    // Validate date range if both dates provided
    if (startDateTime && endDateTime) {
      const dateValidation = validateDateRange(startDateTime, endDateTime)
      if (!dateValidation.valid) {
        return { success: false, error: dateValidation.error! }
      }
    }

    const bookingRequest = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: {
        name: fields.name || undefined,
        category: fields.category || undefined,
        parentCategory: fields.parentCategory || undefined,
        subCategory1: fields.subCategory1 || undefined,
        subCategory2: fields.subCategory2 || undefined,
        subCategory3: fields.subCategory3 || undefined,
        merchant: fields.merchant || undefined,
        businessEmail: fields.businessEmail || undefined,
        startDate: startDateTime || undefined,
        endDate: endDateTime || undefined,
      },
    })

    // Also update the linked event if it exists
    if (bookingRequest.eventId) {
      // Build standardized category key for consistent matching
      const standardizedCategory = buildCategoryKey(
        fields.parentCategory,
        fields.subCategory1,
        fields.subCategory2,
        fields.subCategory3,
        fields.category
      )

      await prisma.event.update({
        where: { id: bookingRequest.eventId },
        data: {
          name: fields.name || undefined,
          category: standardizedCategory, // Store standardized key in category field
          parentCategory: fields.parentCategory || undefined,
          subCategory1: fields.subCategory1 || undefined,
          subCategory2: fields.subCategory2 || undefined,
          subCategory3: fields.subCategory3 || undefined,
          merchant: fields.merchant || undefined,
          startDate: startDateTime || undefined,
          endDate: endDateTime || undefined,
        },
      })
    }

    invalidateEntities(['booking-requests', 'events'])
    return { success: true, data: bookingRequest }
  } catch (error) {
    return handleServerActionError(error, 'updateBookingRequest')
  }
}

/**
 * Update booking request status (for future use by admins)
 */
export async function updateBookingRequestStatus(
  requestId: string, 
  status: BookingRequestStatus
) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Get current status for logging
    const currentRequest = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      select: { status: true, name: true },
    })

    const bookingRequest = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: { status },
    })

    // Log status change
    if (currentRequest?.status !== status) {
      await logActivity({
        action: 'STATUS_CHANGE',
        entityType: 'BookingRequest',
        entityId: requestId,
        entityName: bookingRequest.name,
        details: {
          statusChange: { from: currentRequest?.status || 'unknown', to: status },
        },
      })
    }

    invalidateEntity('booking-requests')
    return { success: true, data: bookingRequest }
  } catch (error) {
    logger.error('Error updating booking request status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update status' 
    }
  }
}

/**
 * Bulk delete booking requests
 */
export async function bulkDeleteBookingRequests(requestIds: string[]) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can bulk delete booking requests
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Delete multiple requests
    await prisma.bookingRequest.deleteMany({
      where: {
        id: { in: requestIds },
      },
    })

    invalidateEntity('booking-requests')
    return { success: true, deletedCount: requestIds.length }
  } catch (error) {
    return handleServerActionError(error, 'bulkDeleteBookingRequests')
  }
}

/**
 * Bulk update booking request status
 */
export async function bulkUpdateBookingRequestStatus(requestIds: string[], status: BookingRequestStatus) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const whereClause = buildRoleBasedWhereClause(role, userId, 'booking-request')
    
    if (!whereClause.hasAccess) {
      return { success: false, error: 'Unauthorized' }
    }

    // Update multiple requests
    const result = await prisma.bookingRequest.updateMany({
      where: {
        id: { in: requestIds },
        ...whereClause.whereClause,
      },
      data: {
        status,
        processedAt: status !== 'draft' && status !== 'pending' ? new Date() : undefined,
      },
    })

    invalidateEntity('booking-requests')
    return { success: true, updatedCount: result.count }
  } catch (error) {
    return handleServerActionError(error, 'bulkUpdateBookingRequestStatus')
  }
}

/**
 * Resend booking request email
 * Only works for draft or pending statuses (not approved, booked, or rejected)
 * Supports sending to multiple email addresses
 */
export async function resendBookingRequest(requestId: string, emails?: string | string[]) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Fetch the booking request
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
    })

    if (!bookingRequest) {
      return { success: false, error: 'Booking request not found' }
    }

    // Check if status allows resending (only draft or pending)
    if (bookingRequest.status === 'approved' || 
        bookingRequest.status === 'booked' || 
        bookingRequest.status === 'rejected') {
      return { 
        success: false, 
        error: 'Cannot resend request that is already approved, booked, or rejected' 
      }
    }

    // Normalize emails to array
    const emailArray = emails 
      ? (Array.isArray(emails) ? emails : [emails])
      : [bookingRequest.businessEmail]
    
    // Filter out empty emails and get unique values
    const uniqueEmails = [...new Set(emailArray.filter(e => e && e.trim()))]
    
    if (uniqueEmails.length === 0) {
      return { success: false, error: 'No valid email addresses provided' }
    }

    // Primary email is the first one (update booking request if different)
    const primaryEmail = uniqueEmails[0]
    if (primaryEmail !== bookingRequest.businessEmail) {
      await prisma.bookingRequest.update({
        where: { id: requestId },
        data: { businessEmail: primaryEmail },
      })
    }

    // Send emails to all recipients
    const results = await Promise.all(
      uniqueEmails.map(email => 
        resendBookingRequestEmail({
          id: bookingRequest.id,
          name: bookingRequest.name,
          businessEmail: email,
          merchant: bookingRequest.merchant,
          category: bookingRequest.category,
          parentCategory: bookingRequest.parentCategory,
          subCategory1: bookingRequest.subCategory1,
          subCategory2: bookingRequest.subCategory2,
          startDate: bookingRequest.startDate,
          endDate: bookingRequest.endDate,
          userId: bookingRequest.userId,
        })
      )
    )

    // Check if any emails failed
    const failedEmails = results.filter(r => !r.success)
    if (failedEmails.length === results.length) {
      return { success: false, error: 'Failed to send emails to all recipients' }
    }

    // Log activity
    await logActivity({
      action: 'RESEND',
      entityType: 'BookingRequest',
      entityId: bookingRequest.id,
      entityName: bookingRequest.name,
      details: {
        metadata: { sentTo: uniqueEmails },
      },
    })

    // Revalidate cache
    invalidateEntity('booking-requests')

    return { 
      success: true, 
      sentCount: results.filter(r => r.success).length,
      totalCount: uniqueEmails.length
    }
  } catch (error) {
    return handleServerActionError(error, 'resendBookingRequest')
  }
}

/**
 * Reject a booking request with a reason (called from rejected page form)
 */
export async function rejectBookingRequestWithReason(token: string, rejectionReason: string) {
  try {
    // Verify token
    const { verifyApprovalToken } = await import('@/lib/tokens')
    const verification = verifyApprovalToken(token)

    if (!verification.valid || verification.action !== 'reject') {
      return { success: false, error: verification.error || 'Invalid token' }
    }

    if (!verification.requestId) {
      return { success: false, error: 'Invalid token: missing request ID' }
    }

    // Validate rejection reason
    if (!rejectionReason || !rejectionReason.trim()) {
      return { success: false, error: 'Rejection reason is required' }
    }

    // Get the booking request
    const existingRequest = await prisma.bookingRequest.findUnique({
      where: { id: verification.requestId },
    })

    if (!existingRequest) {
      return { success: false, error: 'Booking request not found' }
    }

    // Check if already rejected
    if (existingRequest.status === 'rejected') {
      return { success: false, error: 'This request has already been rejected' }
    }

    // Update booking request status to rejected with reason
    const bookingRequest = await prisma.bookingRequest.update({
      where: { id: verification.requestId },
      data: { 
        status: 'rejected',
        processedAt: new Date(),
        processedBy: existingRequest.businessEmail,
        rejectionReason: rejectionReason.trim(),
      },
    })

    // Also update the linked event status if it exists
    if (bookingRequest.eventId) {
      await prisma.event.update({
        where: { id: bookingRequest.eventId },
        data: { status: 'rejected' },
      })
    }

    // Send rejection email to business and requester
    try {
      const { sendRejectionEmail } = await import('@/lib/email/services/rejection')
      await sendRejectionEmail(bookingRequest, rejectionReason.trim())
    } catch (emailError) {
      logger.error('Error sending rejection email:', emailError)
      // Don't fail the rejection if email fails
    }

    // Log activity (note: this is from external user via token, no auth context)
    try {
      await prisma.activityLog.create({
        data: {
          userId: 'external',
          userName: existingRequest.businessEmail,
          action: 'REJECT',
          entityType: 'BookingRequest',
          entityId: bookingRequest.id,
          entityName: bookingRequest.name,
          details: {
            statusChange: { from: existingRequest.status, to: 'rejected' },
            metadata: { rejectionReason: rejectionReason.trim() },
          },
        },
      })
    } catch (logError) {
      logger.error('Error logging rejection activity:', logError)
    }

    invalidateEntities(['booking-requests', 'events'])

    return { success: true, data: bookingRequest }
  } catch (error) {
    return handleServerActionError(error, 'rejectBookingRequestWithReason')
  }
}

/**
 * Cancel a booking request
 * Only the creator or admin can cancel
 * Only 'draft' and 'pending' statuses can be cancelled
 */
export async function cancelBookingRequest(requestId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Fetch the booking request
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
    })

    if (!bookingRequest) {
      return { success: false, error: 'Solicitud no encontrada' }
    }

    // Check permissions: only creator or admin can cancel
    const role = await getUserRole()
    const isCreator = bookingRequest.userId === userId
    const isAdmin = role === 'admin'

    if (!isCreator && !isAdmin) {
      return { success: false, error: 'No tienes permiso para cancelar esta solicitud' }
    }

    // Check if status allows cancellation (only draft or pending)
    if (bookingRequest.status !== 'draft' && bookingRequest.status !== 'pending') {
      return { 
        success: false, 
        error: 'Solo se pueden cancelar solicitudes en estado borrador o pendiente' 
      }
    }

    // Get user info for processedBy
    const user = await currentUser()
    const cancelledBy = user?.emailAddresses?.[0]?.emailAddress || userId

    // Update status to cancelled
    const updatedRequest = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: { 
        status: 'cancelled',
        processedAt: new Date(),
        processedBy: cancelledBy,
      },
    })

    // Log activity
    await logActivity({
      action: 'CANCEL',
      entityType: 'BookingRequest',
      entityId: updatedRequest.id,
      entityName: updatedRequest.name,
      details: {
        statusChange: { from: bookingRequest.status, to: 'cancelled' },
      },
    })

    invalidateEntity('booking-requests')
    return { success: true, data: updatedRequest }
  } catch (error) {
    return handleServerActionError(error, 'cancelBookingRequest')
  }
}

