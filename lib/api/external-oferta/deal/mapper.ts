/**
 * Mapper: BookingFormData → ExternalOfertaDealRequest
 * 
 * Transforms internal booking form data to external API format
 */

import type { BookingFormData } from '@/components/RequestForm/types'
import type { ExternalOfertaDealRequest, ExternalOfertaDeal, ExternalOfertaPriceOption } from './types'

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
      const titleText = (opt.title || '').trim()
      const rawDescription = opt.description?.trim() || null
      const description = titleText || rawDescription || `Opción ${index + 1}`
      const price = parseFloat(opt.price || '0') || 0

      const UNLIMITED_VALUE = 2000
      
      return {
        price,
        value: opt.realValue ? parseFloat(opt.realValue) || null : null,
        description,
        maximumQuantity: parseQuantity(opt.quantity) ?? UNLIMITED_VALUE,
        limitByUser: parseOptionalInt(opt.limitByUser) ?? UNLIMITED_VALUE,
        giftLimitPerUser: parseOptionalInt(opt.maxGiftsPerUser) ?? UNLIMITED_VALUE,
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
    // Default new deals to QR redemption unless explicitly changed upstream.
    qrCodes: true,

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

// ============================================================
// Reverse Mapper: ExternalOfertaDeal → Partial<BookingFormData>
// ============================================================

/**
 * Convert seconds back to days string
 */
function secondsToDays(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return ''
  const days = Math.round(seconds / (24 * 60 * 60))
  return days > 0 ? String(days) : ''
}

/**
 * Convert boolean to "Sí"/"No" string
 */
function booleanToString(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value ? 'Sí' : 'No'
}

/**
 * Convert quantity number to string, null → "Ilimitado"
 */
function quantityToString(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Ilimitado'
  return String(value)
}

/**
 * Extract ISO date (YYYY-MM-DD) from a datetime string
 */
function extractDate(value: string | null | undefined): string {
  if (!value) return ''
  return value.split('T')[0] || ''
}

/**
 * Field mapping metadata for displaying which external API fields
 * map to which booking form fields (used by the test page)
 */
export interface FieldMapping {
  apiField: string
  formField: string | null
  label: string
  category: 'required' | 'content' | 'media' | 'pricing' | 'dates' | 'flags' | 'booking' | 'metadata' | 'vendor'
}

/**
 * Complete field mapping reference between ExternalOfertaDeal and BookingFormData.
 * formField is null when there is no direct match in BookingFormData.
 */
export const DEAL_FIELD_MAPPINGS: FieldMapping[] = [
  // Required
  { apiField: 'nameEs', formField: 'nameEs', label: 'Título de la oferta', category: 'required' },
  { apiField: 'slug', formField: null, label: 'URL slug', category: 'required' },
  { apiField: 'emailSubject', formField: null, label: 'Newsletter subject', category: 'required' },
  { apiField: 'summaryEs', formField: 'aboutOffer', label: 'Acerca de esta oferta', category: 'required' },
  { apiField: 'expiresOn', formField: 'endDate', label: 'Fecha de expiración', category: 'required' },
  { apiField: 'categoryId', formField: null, label: 'Category ID', category: 'required' },

  // Vendor
  { apiField: 'vendorId', formField: null, label: 'Vendor ID (external)', category: 'vendor' },
  { apiField: 'vendorName', formField: 'businessName', label: 'Nombre del negocio', category: 'vendor' },

  // Content
  { apiField: 'shortTitle', formField: 'shortTitle', label: 'Título corto', category: 'content' },
  { apiField: 'tags', formField: null, label: 'Tags', category: 'content' },
  { apiField: 'segments', formField: null, label: 'Segmentos', category: 'content' },
  { apiField: 'voucherSubject', formField: null, label: 'Voucher subject', category: 'content' },
  { apiField: 'emailBusinessName', formField: 'businessName', label: 'Email business name', category: 'content' },
  { apiField: 'emailTitle', formField: 'emailTitle', label: 'Título del email', category: 'content' },
  { apiField: 'goodToKnowEs', formField: 'goodToKnow', label: 'Lo que conviene saber', category: 'content' },
  { apiField: 'websitesEs', formField: 'socialMedia', label: 'Websites / Redes sociales', category: 'content' },
  { apiField: 'howToUseEs', formField: 'howToUseEs', label: 'Cómo usar', category: 'content' },
  { apiField: 'noteworthy', formField: 'whatWeLike', label: 'Lo que nos gusta', category: 'content' },
  { apiField: 'reviewsEs', formField: 'businessReview', label: 'Reseña del negocio', category: 'content' },
  { apiField: 'vendorAddress', formField: 'addressAndHours', label: 'Dirección y horarios', category: 'content' },
  { apiField: 'appLocation', formField: null, label: 'App location', category: 'content' },
  { apiField: 'banner1Line1', formField: null, label: 'Banner line 1', category: 'content' },
  { apiField: 'paymentDetails', formField: 'paymentInstructions', label: 'Detalles de pago', category: 'content' },
  { apiField: 'url', formField: null, label: 'URL externa', category: 'content' },
  { apiField: 'creditCardRestrictions', formField: null, label: 'Restricciones de tarjeta', category: 'content' },
  { apiField: 'specialCategoryNameEs', formField: null, label: 'Categoría especial', category: 'content' },
  { apiField: 'commonRedeemCode', formField: null, label: 'Código de redención', category: 'content' },

  // Media
  { apiField: 'images', formField: 'dealImages', label: 'Imágenes de galería', category: 'media' },
  { apiField: 'verticalVideos', formField: null, label: 'Videos verticales', category: 'media' },
  { apiField: 'dealImage', formField: null, label: 'Banner principal', category: 'media' },
  { apiField: 'dealImageMail', formField: null, label: 'Banner email', category: 'media' },
  { apiField: 'dealImageBanner', formField: null, label: 'Banner degusta', category: 'media' },
  { apiField: 'vendorLogo', formField: null, label: 'Logo del vendor', category: 'media' },

  // Metadata
  { apiField: 'section', formField: null, label: 'Sección', category: 'metadata' },
  { apiField: 'osSalesId', formField: null, label: 'OS Sales ID (external, not mapped)', category: 'metadata' },
  { apiField: 'emeraldPearl', formField: null, label: 'Emerald Pearl', category: 'metadata' },
  { apiField: 'contractState', formField: null, label: 'Estado del contrato', category: 'metadata' },
  { apiField: 'dealStrength', formField: null, label: 'Deal strength', category: 'metadata' },
  { apiField: 'nextDayStrength', formField: null, label: 'Next day strength', category: 'metadata' },
  { apiField: 'category1Id', formField: null, label: 'Categoría secundaria 1', category: 'metadata' },
  { apiField: 'category2Id', formField: null, label: 'Categoría secundaria 2', category: 'metadata' },
  { apiField: 'category3Id', formField: null, label: 'Categoría secundaria 3', category: 'metadata' },

  // Dates
  { apiField: 'runAt', formField: 'startDate', label: 'Fecha de inicio', category: 'dates' },
  { apiField: 'endAt', formField: 'endDate', label: 'Fecha de fin', category: 'dates' },
  { apiField: 'firstPaymentDate', formField: null, label: 'Primer pago', category: 'dates' },
  { apiField: 'lastPaymentDate', formField: null, label: 'Último pago', category: 'dates' },

  // Pricing
  { apiField: 'priceOptions', formField: 'pricingOptions', label: 'Opciones de precio', category: 'pricing' },

  // Booking
  { apiField: 'isBooking', formField: null, label: 'Requiere booking', category: 'booking' },
  { apiField: 'bookingLat', formField: null, label: 'Latitud', category: 'booking' },
  { apiField: 'bookingLng', formField: null, label: 'Longitud', category: 'booking' },
  { apiField: 'bookingAddress', formField: null, label: 'Dirección booking', category: 'booking' },
  { apiField: 'bookingRegistrationInformation', formField: null, label: 'Información de registro', category: 'booking' },
  { apiField: 'bookingEmailHtml', formField: null, label: 'Email HTML booking', category: 'booking' },

  // Boolean flags
  { apiField: 'topSeller', formField: null, label: 'Top Seller', category: 'flags' },
  { apiField: 'bsetOfOs', formField: null, label: 'Best of OS', category: 'flags' },
  { apiField: 'stValentine', formField: null, label: 'San Valentín', category: 'flags' },
  { apiField: 'justMama', formField: null, label: 'Just Mama', category: 'flags' },
  { apiField: 'christmas', formField: null, label: 'Navidad', category: 'flags' },
  { apiField: 'celebrate', formField: null, label: 'Celebrar', category: 'flags' },
  { apiField: 'exploreGamboa', formField: null, label: 'Explore Gamboa', category: 'flags' },
  { apiField: 'cyberMonday', formField: null, label: 'Cyber Monday', category: 'flags' },
  { apiField: 'backToSchool', formField: null, label: 'Back to School', category: 'flags' },
  { apiField: 'newFlag', formField: null, label: 'Flag Nuevo', category: 'flags' },
  { apiField: 'limitedTime', formField: null, label: 'Tiempo limitado', category: 'flags' },
  { apiField: 'westinWeek', formField: null, label: 'Westin Week', category: 'flags' },
  { apiField: 'special', formField: null, label: 'Especial', category: 'flags' },
  { apiField: 'couponEnabled', formField: null, label: 'Cupón habilitado', category: 'flags' },
  { apiField: 'secretDeal', formField: null, label: 'Deal secreto', category: 'flags' },
  { apiField: 'singleImageTile', formField: null, label: 'Single image tile', category: 'flags' },
  { apiField: 'blockReferal', formField: null, label: 'Bloquear referidos', category: 'flags' },
  { apiField: 'isActive', formField: null, label: 'Activo', category: 'flags' },
  { apiField: 'limitedQuantity', formField: null, label: 'Cantidad limitada', category: 'flags' },
  { apiField: 'isHideRemainingTime', formField: null, label: 'Ocultar tiempo restante', category: 'flags' },
  { apiField: 'f2x1', formField: null, label: '2x1', category: 'flags' },
  { apiField: 'hideIfHasSGCards', formField: null, label: 'Ocultar si tiene SG cards', category: 'flags' },
  { apiField: 'onlyOnWeb', formField: null, label: 'Solo web', category: 'flags' },
  { apiField: 'appOnly', formField: null, label: 'Solo app', category: 'flags' },
  { apiField: 'simpleGoOnly', formField: null, label: 'Solo SimpleGo', category: 'flags' },
  { apiField: 'isSelfRedeemVoucher', formField: null, label: 'Auto-redimible', category: 'flags' },
  { apiField: 'ofertasimpleGiftcardOffer', formField: null, label: 'Gift card OS', category: 'flags' },
  { apiField: 'emailReminder', formField: null, label: 'Email reminder', category: 'flags' },
  { apiField: 'emailReminder15', formField: null, label: 'Reminder 15 días', category: 'flags' },
  { apiField: 'emailReminder45', formField: null, label: 'Reminder 45 días', category: 'flags' },
  { apiField: 'buyButtonUrl', formField: null, label: 'Buy button URL', category: 'flags' },
  { apiField: 'buyButtonTitle', formField: null, label: 'Buy button title', category: 'flags' },
  { apiField: 'buyNow', formField: null, label: 'Comprar ahora', category: 'flags' },
  { apiField: 'addToCart', formField: null, label: 'Agregar al carrito', category: 'flags' },
  { apiField: 'gift', formField: null, label: 'Regalar', category: 'flags' },
  { apiField: 'notifyMe', formField: null, label: 'Notificarme', category: 'flags' },
  { apiField: 'showDiscount', formField: null, label: 'Mostrar descuento', category: 'flags' },
  { apiField: 'qrCodes', formField: null, label: 'QR codes', category: 'flags' },
  { apiField: 'barcode', formField: null, label: 'Barcode', category: 'flags' },
  { apiField: 'useStoredRedeemCode', formField: null, label: 'Usar código almacenado', category: 'flags' },
]

/**
 * Reverse-map an ExternalOfertaDeal to a partial BookingFormData.
 * Maps all fields that have a direct correspondence.
 */
export function mapApiToBookingForm(deal: ExternalOfertaDeal): Partial<BookingFormData> {
  const UNLIMITED_VALUE = 2000
  const unlimitedOrValue = (v: number | null | undefined): string => {
    if (v == null || v >= UNLIMITED_VALUE) return ''
    return String(v)
  }

  const pricingOptions: BookingFormData['pricingOptions'] = (deal.priceOptions || []).map((opt, index) => ({
    title: opt.description || `Opción ${index + 1}`,
    description: opt.description || '',
    price: opt.price != null ? String(opt.price) : '',
    realValue: opt.value != null ? String(opt.value) : '',
    quantity: opt.maximumQuantity != null && opt.maximumQuantity >= UNLIMITED_VALUE ? '' : quantityToString(opt.maximumQuantity),
    limitByUser: unlimitedOrValue(opt.limitByUser),
    maxGiftsPerUser: unlimitedOrValue(opt.giftLimitPerUser),
    endAt: opt.endAt || '',
    expiresIn: secondsToDays(opt.expiresIn) || '',
    imageUrl: '',
  }))

  const dealImages: BookingFormData['dealImages'] = (deal.images || []).map((url, index) => ({
    url,
    order: index,
  }))

  // Derive offerMargin from first price option (all options share the same margin)
  const firstMargin = deal.priceOptions?.[0]?.oufferMargin
  const offerMargin = firstMargin != null ? String(firstMargin) : ''

  return {
    // Core content
    nameEs: deal.nameEs || '',
    shortTitle: deal.shortTitle || '',
    emailTitle: deal.emailTitle || '',
    aboutOffer: deal.summaryEs || '',
    goodToKnow: deal.goodToKnowEs || '',
    howToUseEs: deal.howToUseEs || '',
    whatWeLike: deal.noteworthy || '',
    businessReview: deal.reviewsEs || '',

    // Business / vendor
    businessName: deal.vendorName || deal.emailBusinessName || '',

    // Location / directory
    addressAndHours: deal.vendorAddress || '',

    // Payment
    paymentInstructions: deal.paymentDetails || '',

    // Websites / social media
    socialMedia: deal.websitesEs || '',

    // Note: startDate/endDate intentionally omitted — they belong to the
    // previous campaign and should not be carried into a new booking request.

    // Pricing
    offerMargin,
    pricingOptions,

    // Images
    dealImages,

    // Note: osSalesId is an external numeric ID, NOT an internal opportunity UUID.
    // Do not map it to opportunityId — that would cause lookup failures.
  }
}
