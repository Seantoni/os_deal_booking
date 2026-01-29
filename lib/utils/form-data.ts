/**
 * FormData extraction utilities
 * Centralized functions for extracting and parsing FormData
 */

/**
 * Parse JSON field from FormData
 * Safely parses JSON strings, returns null on error
 */
export function parseFormDataJsonField(
  formData: FormData,
  fieldName: string
): unknown {
  const value = formData.get(fieldName) as string
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch (e) {
    console.error(`Error parsing JSON field ${fieldName}:`, e)
    return null
  }
}

/**
 * Extract string field from FormData with null fallback
 */
export function getFormDataString(
  formData: FormData,
  fieldName: string
): string | null {
  const value = formData.get(fieldName) as string
  return value || null
}

/**
 * Extract all booking request fields from FormData
 * Returns a structured object with all fields
 */
export function extractBookingRequestFromFormData(formData: FormData): {
  // Basic fields
  name: string | null
  description: string | null
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  merchant: string | null
  businessEmail: string | null
  additionalEmails: string[] | null
  startDate: string | null
  endDate: string | null
  opportunityId: string | null

  // Configuración: Configuración General y Vigencia
  campaignDuration: string | null
  campaignDurationUnit: string | null

  // Operatividad: Operatividad y Pagos
  redemptionMode: string | null
  isRecurring: string | null
  recurringOfferLink: string | null
  paymentType: string | null
  paymentInstructions: string | null

  // Directorio: Directorio de Responsables
  redemptionContactName: string | null
  redemptionContactEmail: string | null
  redemptionContactPhone: string | null

  // Fiscales: Datos Fiscales, Bancarios y de Ubicación
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

  // Negocio: Reglas de Negocio y Restricciones
  includesTaxes: string | null
  validOnHolidays: string | null
  hasExclusivity: string | null
  blackoutDates: string | null
  exclusivityCondition: string | null
  hasOtherBranches: string | null

  // Descripción: Descripción y Canales de Venta
  redemptionMethods: string[] | null
  contactDetails: string | null
  socialMedia: string | null

  // Contenido: AI-Generated Content Fields
  shortTitle: string | null
  whatWeLike: string | null
  aboutCompany: string | null
  aboutOffer: string | null
  goodToKnow: string | null

  // Estructura: Estructura de la Oferta
  offerMargin: string | null
  pricingOptions: Array<{ optionName: string; originalPrice: string; discountPrice: string; discount: string; pricePerUnit?: string; discountPerUnit?: string; unitLabel?: string }> | null
  dealImages: Array<{ url: string; order: number }> | null

  // Políticas: Políticas Generales
  cancellationPolicy: string | null
  marketValidation: string | null
  additionalComments: string | null

  // Información Adicional (Dynamic template-based)
  additionalInfo: {
    templateName: string
    templateDisplayName: string
    fields: Record<string, string>
  } | null
} {
  return {
    // Basic fields
    name: getFormDataString(formData, 'name'),
    description: getFormDataString(formData, 'description'),
    category: getFormDataString(formData, 'category'),
    parentCategory: getFormDataString(formData, 'parentCategory'),
    subCategory1: getFormDataString(formData, 'subCategory1'),
    subCategory2: getFormDataString(formData, 'subCategory2'),
    subCategory3: getFormDataString(formData, 'subCategory3'),
    merchant: getFormDataString(formData, 'merchant'),
    businessEmail: getFormDataString(formData, 'businessEmail'),
    additionalEmails: parseFormDataJsonField(formData, 'additionalEmails') as string[] | null,
    startDate: getFormDataString(formData, 'startDate'),
    endDate: getFormDataString(formData, 'endDate'),
    opportunityId: getFormDataString(formData, 'opportunityId'),

    // Configuración: Configuración General y Vigencia
    campaignDuration: getFormDataString(formData, 'campaignDuration'),
    campaignDurationUnit: getFormDataString(formData, 'campaignDurationUnit'),

    // Operatividad: Operatividad y Pagos
    redemptionMode: getFormDataString(formData, 'redemptionMode'),
    isRecurring: getFormDataString(formData, 'isRecurring'),
    recurringOfferLink: getFormDataString(formData, 'recurringOfferLink'),
    paymentType: getFormDataString(formData, 'paymentType'),
    paymentInstructions: getFormDataString(formData, 'paymentInstructions'),

    // Directorio: Directorio de Responsables
    redemptionContactName: getFormDataString(formData, 'redemptionContactName'),
    redemptionContactEmail: getFormDataString(formData, 'redemptionContactEmail'),
    redemptionContactPhone: getFormDataString(formData, 'redemptionContactPhone'),

    // Fiscales: Datos Fiscales, Bancarios y de Ubicación
    legalName: getFormDataString(formData, 'legalName'),
    rucDv: getFormDataString(formData, 'rucDv'),
    bankAccountName: getFormDataString(formData, 'bankAccountName'),
    bank: getFormDataString(formData, 'bank'),
    accountNumber: getFormDataString(formData, 'accountNumber'),
    accountType: getFormDataString(formData, 'accountType'),
    addressAndHours: getFormDataString(formData, 'addressAndHours'),
    province: getFormDataString(formData, 'province'),
    district: getFormDataString(formData, 'district'),
    corregimiento: getFormDataString(formData, 'corregimiento'),

    // Negocio: Reglas de Negocio y Restricciones
    includesTaxes: getFormDataString(formData, 'includesTaxes'),
    validOnHolidays: getFormDataString(formData, 'validOnHolidays'),
    hasExclusivity: getFormDataString(formData, 'hasExclusivity'),
    blackoutDates: getFormDataString(formData, 'blackoutDates'),
    exclusivityCondition: getFormDataString(formData, 'exclusivityCondition'),
    hasOtherBranches: getFormDataString(formData, 'hasOtherBranches'),

    // Descripción: Descripción y Canales de Venta
    redemptionMethods: parseFormDataJsonField(formData, 'redemptionMethods') as string[] | null,
    contactDetails: getFormDataString(formData, 'contactDetails'),
    socialMedia: getFormDataString(formData, 'socialMedia'),

    // Contenido: AI-Generated Content Fields
    shortTitle: getFormDataString(formData, 'shortTitle'),
    whatWeLike: getFormDataString(formData, 'whatWeLike'),
    aboutCompany: getFormDataString(formData, 'aboutCompany'),
    aboutOffer: getFormDataString(formData, 'aboutOffer'),
    goodToKnow: getFormDataString(formData, 'goodToKnow'),

    // Estructura: Estructura de la Oferta
    offerMargin: getFormDataString(formData, 'offerMargin'),
    pricingOptions: parseFormDataJsonField(formData, 'pricingOptions') as Array<{ optionName: string; originalPrice: string; discountPrice: string; discount: string; pricePerUnit?: string; discountPerUnit?: string; unitLabel?: string }> | null,
    dealImages: parseFormDataJsonField(formData, 'dealImages') as Array<{ url: string; order: number }> | null,

    // Políticas: Políticas Generales
    cancellationPolicy: getFormDataString(formData, 'cancellationPolicy'),
    marketValidation: getFormDataString(formData, 'marketValidation'),
    additionalComments: getFormDataString(formData, 'additionalComments'),

    // Información Adicional (Dynamic template-based)
    additionalInfo: parseFormDataJsonField(formData, 'additionalInfo') as { templateName: string; templateDisplayName: string; fields: Record<string, string> } | null,
  }
}

