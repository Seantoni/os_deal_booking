/**
 * Mapper: BookingFormData → ExternalOfertaDealRequest
 * 
 * Transforms internal booking form data to external API format
 */

import type { BookingFormData } from '@/components/RequestForm/types'
import type { ExternalOfertaDealRequest, ExternalOfertaPriceOption } from './types'

/**
 * Convert "Sí"/"No" string to boolean
 */
function stringToBoolean(value: string | null | undefined, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue
  return value.toLowerCase() === 'sí' || value.toLowerCase() === 'si' || value.toLowerCase() === 'yes'
}

/**
 * Parse quantity string to number or null
 * Handles "Ilimitado" → null
 */
function parseQuantity(quantity: string | null | undefined): number | null {
  if (!quantity) return null
  const lower = quantity.toLowerCase()
  if (lower === 'ilimitado' || lower === 'unlimited') return null
  const parsed = parseInt(quantity, 10)
  return isNaN(parsed) ? null : parsed
}

/**
 * Parse integer string to number or null
 */
function parseOptionalInt(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}

/**
 * Convert days to seconds for API expiresIn field
 * API expects seconds since voucher creation
 */
function daysToSeconds(days: string | null | undefined): number | null {
  const parsed = parseOptionalInt(days)
  if (parsed === null) return null
  return parsed * 24 * 60 * 60 // days × 24 hours × 60 minutes × 60 seconds
}

/**
 * Extract URLs from social media string (format: "url1 | url2 | ...")
 */
function extractUrls(socialMedia: string | null | undefined): string[] {
  if (!socialMedia) return []
  return socialMedia
    .split('|')
    .map(url => url.trim())
    .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')))
}

/**
 * Map BookingFormData to ExternalOfertaDealRequest
 * 
 * @param formData - Internal booking form data
 * @param options - Additional mapping options
 * @returns External API request payload
 */
export function mapBookingFormToApi(
  formData: BookingFormData,
  options: {
    categoryId?: number // TODO: Add category mapping later
    vendorId?: number // TODO: Add vendor mapping later
    expiresOn?: string // TODO: Add date mapping later
    slug?: string // TODO: Auto-generate later
    runAt?: string | null // Start date/time (ISO string)
    endAt?: string | null // End date/time (ISO string)
    section?: string | null // External API section (e.g., "Restaurantes", "Hoteles")
  } = {}
): ExternalOfertaDealRequest {
  const firstPricingOption = formData.pricingOptions?.[0]
  
  // Extract offer name from first pricing option (the subtitle shown on deal page)
  const nameEs = firstPricingOption?.title || firstPricingOption?.description || formData.businessName || ''
  
  // summaryEs (required by API): use "Acerca de esta oferta" first, then fall back
  const summaryEs = formData.aboutOffer || firstPricingOption?.title || formData.businessName || ''
  
  // Extract email subject (use business name as default)
  const emailSubject = formData.businessName || nameEs || ''
  
  // Extract images from dealImages array (sorted by order)
  const galleryImages = (formData.dealImages || [])
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(img => img.url)
    .filter(Boolean) as string[]

  // Extract images from pricing options
  const pricingOptionImages = (formData.pricingOptions || [])
    .map(opt => opt.imageUrl)
    .filter(Boolean) as string[]

  // Combine all images (gallery first, then pricing options), removing duplicates
  const allImagesSet = new Set([...galleryImages, ...pricingOptionImages])
  const images = Array.from(allImagesSet)

  // Parse offer margin (applies to all options)
  const offerMargin = parseOptionalInt(formData.offerMargin)

  // Map pricing options - filter out invalid ones and ensure required fields
  const priceOptions: ExternalOfertaPriceOption[] = (formData.pricingOptions || [])
    .filter(opt => {
      const title = opt.title || ''
      const price = parseFloat(opt.price || '0') || 0
      // Only include options with valid title and price
      return title.trim() !== '' && price > 0
    })
    .map(opt => {
      const title = (opt.title || '').trim()
      const price = parseFloat(opt.price || '0') || 0
      
      return {
        title,
        price,
        value: opt.realValue ? parseFloat(opt.realValue) || null : null,
        description: opt.description?.trim() || null,
        maximumQuantity: parseQuantity(opt.quantity),
        limitByUser: parseOptionalInt(opt.limitByUser),
        giftLimitPerUser: parseOptionalInt(opt.maxGiftsPerUser),
        endAt: opt.endAt || null,
        expiresIn: daysToSeconds(opt.expiresIn),
        oufferMargin: offerMargin, // Apply same margin to all options (API typo is intentional)
      }
    })

  // Extract websites from contactDetails or socialMedia
  const websites = extractUrls(formData.socialMedia || formData.contactDetails)

  return {
    // Required fields (will need to be provided or have defaults)
    nameEs,
    shortTitle: formData.shortTitle || null, // "Título" - AI generated (e.g. "$14 por Rodizio todo incluido")
    slug: options.slug || nameEs.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deal',
    emailSubject: emailSubject,
    summaryEs: summaryEs,
    expiresOn: options.expiresOn || '', // TODO: Map from endDate
    categoryId: options.categoryId || 0, // TODO: Map from category

    // Vendor
    vendorName: formData.businessName || null,
    vendorId: options.vendorId || null,

    // Content fields
    goodToKnowEs: formData.goodToKnow || null, // "Lo que conviene saber"
    noteworthy: formData.whatWeLike || null, // "Lo que nos gusta"
    reviewsEs: formData.businessReview || null,
    // Note: aboutCompany exists in our form but not in API schema
    
    // Email/Marketing
    emailBusinessName: formData.businessName || null,
    // emailTitle: TODO - may need new field
    // voucherSu    bject: TODO - may need new field

    // Address/Location
    vendorAddress: formData.addressAndHours || null,
    // appLocation: Could derive from province/district - TODO

    // Images
    images: images.length > 0 ? images : null,
    dealImage: images[0] || null, // First image as main banner
    // dealImageMail: TODO - may need separate upload or resize
    // dealImageBanner: TODO - may need separate upload or resize
    // vendorLogo: TODO - new field needed

    // Payment/Redemption
    paymentDetails: formData.paymentInstructions || null,
    // commonRedeemCode: TODO - new field needed
    // creditCardRestrictions: TODO - new field needed

    // URLs
    websitesEs: websites.length > 0 ? websites.join(' | ') : null,
    // url: TODO - may need new field

    // Instructions/Details
    howToUseEs: null,
    // banner1Line1: TODO - may need new field

    // Pricing - only include if we have at least one valid option
    priceOptions: priceOptions.length > 0 ? priceOptions : null,

    // Boolean flags (with sensible defaults)
    couponEnabled: false,
    secretDeal: false,
    gift: stringToBoolean(formData.giftVouchers, true),
    isActive: true,
    showDiscount: true,
    limitedQuantity: false,
    qrCodes: false,

    // Internal tracking
    osSalesId: formData.opportunityId ? parseInt(formData.opportunityId, 10) || null : null,
    
    // Dates (TODO: Map from startDate/endDate)
    runAt: options.runAt ?? null,
    endAt: options.endAt ?? null,
    
    // External API section (mapped from category)
    section: options.section || null,
  }
}

/**
 * Validate that required fields are present
 */
export function validateApiRequest(request: ExternalOfertaDealRequest): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!request.nameEs) errors.push('nameEs is required')
  if (!request.slug) errors.push('slug is required')
  if (!request.emailSubject) errors.push('emailSubject is required')
  if (!request.summaryEs) errors.push('summaryEs is required')
  if (!request.expiresOn) errors.push('expiresOn is required')
  if (!request.categoryId) errors.push('categoryId is required')
  if (!request.vendorId && !request.vendorName) {
    errors.push('vendorId or vendorName is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

