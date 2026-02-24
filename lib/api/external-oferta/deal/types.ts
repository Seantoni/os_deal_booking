/**
 * Types for External Oferta Deal API
 * Based on OpenAPI schema from doc.json
 */

export interface ExternalOfertaDealRequest {
  // Required fields
  nameEs: string // Offer name in Spanish
  slug: string // URL slug (skip for now, auto-generate later)
  emailSubject: string // Newsletter subject
  summaryEs: string // Summary in Spanish
  expiresOn: string // Expiration date (ISO string)
  categoryId: number // Category identifier

  // Vendor (required: vendorId OR vendorName)
  vendorId?: number | null
  vendorName?: string | null

  // Optional text fields
  shortTitle?: string | null
  tags?: string | null
  segments?: string | null
  voucherSubject?: string | null
  emailBusinessName?: string | null
  emailTitle?: string | null
  goodToKnowEs?: string | null
  websitesEs?: string | null
  howToUseEs?: string | null
  noteworthy?: string | null
  reviewsEs?: string | null
  vendorAddress?: string | null
  appLocation?: string | null
  banner1Line1?: string | null
  paymentDetails?: string | null
  url?: string | null
  creditCardRestrictions?: string | null
  specialCategoryNameEs?: string | null
  commonRedeemCode?: string | null

  // Optional category IDs
  category1Id?: number | null
  category2Id?: number | null
  category3Id?: number | null

  // Images and media
  images?: string[] | null // Main carousel images (URLs or base64)
  verticalVideos?: string[] | null
  dealImage?: string | null // Main banner (1242x362)
  dealImageMail?: string | null // Mail banner (688x418)
  dealImageBanner?: string | null // Degusta banner (344x209)
  vendorLogo?: string | null

  // Optional metadata
  section?: string | null
  osSalesId?: number | null
  emeraldPearl?: string | null
  contractState?: string | null
  dealStrength?: number | null
  nextDayStrength?: number | null

  // Dates
  runAt?: string | null // Start date/time (ISO string)
  endAt?: string | null // End date/time (ISO string)
  firstPaymentDate?: string | null
  lastPaymentDate?: string | null

  // Boolean flags
  topSeller?: boolean | null
  bsetOfOs?: boolean | null
  stValentine?: boolean | null
  justMama?: boolean | null
  christmas?: boolean | null
  celebrate?: boolean | null
  exploreGamboa?: boolean | null
  cyberMonday?: boolean | null
  backToSchool?: boolean | null
  newFlag?: boolean | null
  limitedTime?: boolean | null
  westinWeek?: boolean | null
  special?: boolean | null
  couponEnabled?: boolean | null
  secretDeal?: boolean | null
  singleImageTile?: boolean | null
  blockReferal?: boolean | null
  isActive?: boolean | null
  limitedQuantity?: boolean | null
  isHideRemainingTime?: boolean | null
  f2x1?: boolean | null
  hideIfHasSGCards?: boolean | null
  onlyOnWeb?: boolean | null
  appOnly?: boolean | null
  simpleGoOnly?: boolean | null
  isSelfRedeemVoucher?: boolean | null
  ofertasimpleGiftcardOffer?: boolean | null
  emailReminder?: boolean | null
  emailReminder15?: boolean | null
  emailReminder45?: boolean | null
  buyButtonUrl?: string | null
  buyButtonTitle?: string | null
  buyNow?: boolean | null
  addToCart?: boolean | null
  gift?: boolean | null
  notifyMe?: boolean | null
  showDiscount?: boolean | null
  qrCodes?: boolean | null
  barcode?: boolean | null
  useStoredRedeemCode?: boolean | null

  // Booking fields
  isBooking?: boolean | null
  bookingLat?: number | null
  bookingLng?: number | null
  bookingAddress?: string | null
  bookingRegistrationInformation?: string | null
  bookingEmailHtml?: string | null

  // Price options
  priceOptions?: ExternalOfertaPriceOption[] | null
}

export interface ExternalOfertaPriceOption {
  title: string
  price: number // Selling price (float)
  value?: number | null // Original value before discount (float)
  maximumQuantity?: number | null // Maximum total quantity
  limitByUser?: number | null // Maximum quantity per user
  giftLimitPerUser?: number | null // Maximum gifts per user
  endAt?: string | null // End date/time for this option (ISO string)
  expiresIn?: number | null // Expiration seconds after voucher creation
  description?: string | null
  oufferMargin?: number | null // Offer margin percentage (note: API typo is intentional)
}

export interface ExternalOfertaDealResponse {
  id: number
  status: string
}

export interface SendDealResult {
  success: boolean
  externalId?: number
  error?: string
  logId?: string
}

// ============================================
// Deal Metrics API Types (GET /deal-metrics)
// ============================================

export interface DealMetric {
  vendor_id: string
  deal_id: string | number // API may return number or string
  deal_name?: string       // Deal name from API
  category1_name?: string | null
  category2_name?: string | null
  category3_name?: string | null
  quantity_sold: number
  net_revenue: number
  margin: number
  run_at: string
  end_at: string
  url: string
  updated_at: string
}

export interface DealMetricsResponse {
  since: string
  data_as_of: string
  limit: number
  offset: number
  total: number
  returned: number
  deals: DealMetric[]
}

export interface FetchMetricsResult {
  success: boolean
  data?: DealMetricsResponse
  error?: string
  logId?: string
}
