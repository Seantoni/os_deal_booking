// Types and constants for deal drafts
// This file is safe to import in client components (no server-only dependencies)

// Types for the draft sections
// Field names match ContenidoStep for consistency
export interface DealDraftContent {
  whatWeLike: string      // Lo que nos gusta
  aboutCompany: string    // La empresa
  aboutOffer: string      // Acerca de esta oferta
  goodToKnow: string      // Lo que conviene saber
  priceOptions: string
  businessName: string
  dealTitle: string
}

export interface DealDraftInput {
  // Basic info
  name: string
  businessEmail: string
  merchant?: string | null
  
  // Dates
  startDate: Date | string
  endDate: Date | string
  
  // Categories
  parentCategory?: string | null
  subCategory1?: string | null
  subCategory2?: string | null
  
  // Business details
  offerDetails?: string | null
  addressAndHours?: string | null
  socialMedia?: string | null
  
  // Pre-filled AI content from ContenidoStep (if available)
  whatWeLike?: string | null
  aboutCompany?: string | null
  aboutOffer?: string | null
  goodToKnow?: string | null
  
  // Pricing
  pricingOptions?: any[] | null
  
  // Terms & Conditions
  redemptionMode?: string | null
  includesTaxes?: string | null
  validOnHolidays?: string | null
  blackoutDates?: string | null
  vouchersPerPerson?: string | null
  giftVouchers?: string | null
  hasOtherBranches?: string | null
  cancellationPolicy?: string | null
  
  // Contact
  redemptionContactName?: string | null
  redemptionContactEmail?: string | null
  redemptionContactPhone?: string | null
  contactDetails?: string | null
  redemptionMethods?: any[] | null
}

// Section labels for display
export const SECTION_LABELS: Record<keyof DealDraftContent, string> = {
  whatWeLike: 'LO QUE NOS GUSTA',
  aboutCompany: 'LA EMPRESA',
  aboutOffer: 'ACERCA DE ESTA OFERTA',
  goodToKnow: 'LO QUE CONVIENE SABER',
  priceOptions: 'PRICE OPTIONS',
  businessName: 'BUSINESS NAME',
  dealTitle: 'DEAL TITLE',
}

// Section order for display
export const SECTION_ORDER: (keyof DealDraftContent)[] = [
  'dealTitle',
  'businessName',
  'whatWeLike',
  'aboutCompany',
  'aboutOffer',
  'goodToKnow',
  'priceOptions',
]

