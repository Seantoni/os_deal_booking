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
function parseQuantity(quantity: string | number | null | undefined): number | null {
  if (quantity === null || quantity === undefined) return null

  if (typeof quantity === 'number') {
    return Number.isInteger(quantity) && quantity >= 0 ? quantity : null
  }

  const normalized = quantity.trim()
  if (!normalized) return null

  const lower = normalized.toLowerCase()
  if (lower === 'ilimitado' || lower === 'unlimited') return null
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number.parseInt(normalized, 10)
  return Number.isNaN(parsed) ? null : parsed
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

function buildPaymentDetails(formData: BookingFormData): string | null {
  const paymentInstructions = formData.paymentInstructions?.trim() || ''

  const additionalAccounts = Array.isArray(formData.additionalBankAccounts)
    ? formData.additionalBankAccounts
        .map((account) => ({
          bankAccountName: String(account.bankAccountName || '').trim(),
          bank: String(account.bank || '').trim(),
          accountNumber: String(account.accountNumber || '').trim(),
          accountType: String(account.accountType || '').trim(),
        }))
        .filter((account) => Object.values(account).some((value) => value.length > 0))
    : []

  const formattedAdditionalAccounts =
    additionalAccounts.length > 0
      ? [
          'Cuentas Bancarias extras',
          ...additionalAccounts
            .map((account) => {
              const details = [
                account.bank ? `Banco: ${account.bank}` : null,
                account.bankAccountName ? `Cuenta: ${account.bankAccountName}` : null,
                account.accountNumber ? `Número: ${account.accountNumber}` : null,
                account.accountType ? `Tipo: ${account.accountType}` : null,
              ].filter((detail): detail is string => !!detail)
              return details.join(' ; ')
            })
            .filter((line) => line.length > 0),
        ].join('\n')
      : ''

  const combined = [paymentInstructions, formattedAdditionalAccounts]
    .filter((value) => value.length > 0)
    .join('\n\n')

  return combined || null
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
    contractState?: string | null // Current state of the contract (external API POST deal)
  } = {}
): ExternalOfertaDealRequest {
  const firstPricingOption = formData.pricingOptions?.[0]
  
  // Use AI-generated title if available, otherwise fall back to pricing option
  const nameEs = formData.nameEs?.trim() || firstPricingOption?.title || firstPricingOption?.description || formData.businessName || ''
  
  // summaryEs (required by API): use "Acerca de esta oferta" first, then fall back
  const summaryEs = formData.aboutOffer || firstPricingOption?.description || firstPricingOption?.title || formData.businessName || ''
  
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
      const optionText = (opt.description || opt.title || '').trim()
      const price = parseFloat(opt.price || '0') || 0
      // Only include options with text and valid price
      return optionText !== '' && price > 0
    })
    .map((opt, index) => {
      const rawDescription = opt.description?.trim() || null
      const titleText = (opt.title || '').trim()
      const description = rawDescription || titleText || `Opción ${index + 1}`
      const price = parseFloat(opt.price || '0') || 0
      
      return {
        price,
        value: opt.realValue ? parseFloat(opt.realValue) || null : null,
        description,
        maximumQuantity: parseQuantity(opt.quantity),
        limitByUser: parseOptionalInt(opt.limitByUser),
        giftLimitPerUser: parseOptionalInt(opt.maxGiftsPerUser),
        endAt: opt.endAt || null,
        expiresIn: daysToSeconds(opt.expiresIn),
        oufferMargin: offerMargin,
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
    emailTitle: formData.emailTitle?.trim() || null,

    // Address/Location
    vendorAddress: formData.addressAndHours || null,
    // appLocation: Could derive from provinceDistrictCorregimiento - TODO

    // Images
    images: images.length > 0 ? images : null,
    dealImage: images[0] || null, // First image as main banner
    // dealImageMail: TODO - may need separate upload or resize
    // dealImageBanner: TODO - may need separate upload or resize
    // vendorLogo: TODO - new field needed

    // Payment/Redemption
    paymentDetails: buildPaymentDetails(formData),
    // commonRedeemCode: TODO - new field needed
    // creditCardRestrictions: TODO - new field needed

    // URLs
    websitesEs: websites.length > 0 ? websites.join(' | ') : null,
    // url: TODO - may need new field

    // Instructions/Details
    howToUseEs: formData.howToUseEs?.trim() || null,

    // Pricing - only include if we have at least one valid option
    priceOptions: priceOptions.length > 0 ? priceOptions : null,

    // Boolean flags (with sensible defaults)
    couponEnabled: false,
    secretDeal: true, // Default to true - new deals start as secret until ready to publish
    gift: true, // Default to true (gift vouchers enabled by default)
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
    // Current state of the contract (nullable)
    contractState: options.contractState ?? null,
  }
}

/**
 * Validate that required fields are present
 */
export function validateDealRequest(request: ExternalOfertaDealRequest): {
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
