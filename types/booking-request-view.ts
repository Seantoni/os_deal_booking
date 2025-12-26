/**
 * Extended BookingRequest type for view modal
 * Includes all fields from the Prisma schema plus relations
 */
import type { BookingRequestStatus } from '@/lib/constants'
import type { FieldComment } from './field-comment'

// Pricing option structure
export interface PricingOption {
  title: string
  description?: string
  price: number
  realValue?: number
  quantity?: number
}

// Additional info structure (dynamic template fields)
export interface AdditionalInfo {
  templateName: string
  templateDisplayName?: string
  fields: Record<string, string>
}

// User reference (for processed by / created by)
export interface UserReference {
  id?: string
  name?: string
  email?: string
}

/**
 * Complete BookingRequest data for the view modal
 * This extends the base type with all fields from Prisma schema
 */
export interface BookingRequestViewData {
  id: string
  name: string
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
  merchant: string | null
  businessEmail: string
  additionalEmails: string[] | null
  startDate: Date | string
  endDate: Date | string
  status: BookingRequestStatus
  eventId: string | null
  opportunityId: string | null
  dealId: string | null
  userId: string
  sourceType: string
  publicLinkToken: string | null
  processedAt: Date | string | null
  processedBy: string | null
  rejectionReason: string | null
  createdAt: Date | string
  updatedAt: Date | string

  // Step 1: Configuración General y Vigencia
  campaignDuration: string | null

  // Step 2: Operatividad y Pagos
  redemptionMode: string | null
  isRecurring: string | null
  recurringOfferLink: string | null
  paymentType: string | null
  paymentInstructions: string | null

  // Step 3: Directorio de Responsables
  redemptionContactName: string | null
  redemptionContactEmail: string | null
  redemptionContactPhone: string | null

  // Step 4: Datos Fiscales, Bancarios y de Ubicación
  legalName: string | null
  rucDv: string | null
  bankAccountName: string | null
  bank: string | null
  accountNumber: string | null
  accountType: string | null
  addressAndHours: string | null
  province: string | null
  district: string | null
  corregimiento: string | null

  // Step 5: Reglas de Negocio y Restricciones
  includesTaxes: string | null
  validOnHolidays: string | null
  hasExclusivity: string | null
  blackoutDates: string | null
  exclusivityCondition: string | null
  giftVouchers: string | null
  hasOtherBranches: string | null
  vouchersPerPerson: string | null
  commission: string | null

  // Step 6: Descripción y Canales de Venta
  redemptionMethods: string[] | null
  contactDetails: string | null
  socialMedia: string | null

  // Contenido: AI-Generated Content Fields
  shortTitle: string | null
  whatWeLike: string | null
  aboutCompany: string | null
  aboutOffer: string | null
  goodToKnow: string | null

  // Step 7: Estructura de la Oferta
  pricingOptions: PricingOption[] | null
  dealImages: Array<{ url: string; order: number }> | null

  // Step 8: Políticas Generales
  cancellationPolicy: string | null
  marketValidation: string | null
  additionalComments: string | null

  // Step 9: Información Adicional
  additionalInfo: AdditionalInfo | null

  // Field Comments
  fieldComments: FieldComment[] | unknown

  // Relations (populated by includes)
  processedByUser?: UserReference | null
  createdByUser?: UserReference | null
}

// Field type enum
export type FieldType = 'date' | 'json' | 'pricing' | 'description' | 'gallery'

// Field definition for sections
export interface FieldDefinition {
  key: string
  label: string
  type?: FieldType
  fromAdditional?: boolean
}

// Section definition
export interface SectionDefinition {
  title: string
  fields: FieldDefinition[]
}

