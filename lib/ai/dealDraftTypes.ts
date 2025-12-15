// Types and constants for deal drafts
// This file is safe to import in client components (no server-only dependencies)

// Types for the draft sections
export interface DealDraftContent {
  loQueNosGusta: string
  laEmpresa: string
  acercaDeEstaOferta: string
  loQueConvieneSaber: string
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
  businessReview?: string | null
  offerDetails?: string | null
  addressAndHours?: string | null
  socialMedia?: string | null
  
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
  loQueNosGusta: 'LO QUE NOS GUSTA',
  laEmpresa: 'LA EMPRESA',
  acercaDeEstaOferta: 'ACERCA DE ESTA OFERTA',
  loQueConvieneSaber: 'LO QUE CONVIENE SABER',
  priceOptions: 'PRICE OPTIONS',
  businessName: 'BUSINESS NAME',
  dealTitle: 'DEAL TITLE',
}

// Section order for display
export const SECTION_ORDER: (keyof DealDraftContent)[] = [
  'dealTitle',
  'businessName',
  'loQueNosGusta',
  'laEmpresa',
  'acercaDeEstaOferta',
  'loQueConvieneSaber',
  'priceOptions',
]

