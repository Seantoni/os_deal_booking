import type { BookingFormData } from './types'
import type { RequestFormFieldsConfig } from '@/types'
import { isValidEmail } from '@/lib/utils/validation'
import { FIELD_TEMPLATES, getTemplateName } from './config'
import { REQUEST_FORM_STEPS } from '@/lib/config/request-form-fields'

// Map form step keys to REQUEST_FORM_STEPS keys (they differ slightly)
const STEP_KEY_MAP: Record<string, string> = {
  'configuracion': 'configuracion',
  'operatividad': 'operatividad',
  'directorio': 'directorio',
  'fiscales': 'fiscales',
  'negocio': 'negocio',
  'estructura': 'estructura',
  'informacion-adicional': 'informacion-adicional',
  'contenido': 'descripcion', // Form uses 'contenido', config uses 'descripcion'
  'validacion': 'politicas', // Form uses 'validacion', config uses 'politicas'
}

export const validateStep = (
  step: number,
  formData: BookingFormData,
  requiredFields?: RequestFormFieldsConfig,
  stepKey?: string
): Record<string, string> => {
  const newErrors: Record<string, string> = {}
  const isRequired = (fieldKey: string) => requiredFields?.[fieldKey]?.required === true
  const templateName = getTemplateName(
    formData.parentCategory,
    formData.subCategory1,
    formData.subCategory2,
    formData.category
  )

  // Find step definition by key (more reliable than by ID due to misalignment)
  const mappedKey = stepKey ? STEP_KEY_MAP[stepKey] || stepKey : null
  const stepDef = mappedKey 
    ? REQUEST_FORM_STEPS.find((s) => s.key === mappedKey)
    : REQUEST_FORM_STEPS.find((s) => s.id === step)

  const shouldValidateField = (fieldKey: string): boolean => {
    if (!stepDef) return false
    const def = stepDef.fields.find((f) => f.key === fieldKey)
    if (!def) return false
    if (def.categorySpecific && def.template) {
      if (!templateName || templateName !== def.template) return false
    }
    if (fieldKey === 'recurringOfferLink' && formData.isRecurring !== 'Sí') return false
    return isRequired(fieldKey)
  }

  const isEmpty = (value: unknown) => {
    if (Array.isArray(value)) return value.length === 0
    if (value === undefined || value === null) return true
    if (typeof value === 'string') return value.trim().length === 0
    return false
  }

  // Generic required-field validation for the current step
  if (stepDef) {
    stepDef.fields.forEach((field) => {
      if (!shouldValidateField(field.key)) return
      const value = formData[field.key as keyof BookingFormData]
      if (isEmpty(value)) {
        newErrors[field.key] = 'Requerido'
      }
    })
  }

  switch (step) {
    case 1:
      // Configuración: Configuración General y Vigencia (merged)
      if (formData.partnerEmail && !isValidEmail(formData.partnerEmail)) {
        newErrors.partnerEmail = 'Email inválido'
      }
      if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
        newErrors.endDate = 'La fecha final debe ser posterior a la fecha inicial'
      }
      break
    case 2:
      // Operatividad: Operatividad y Pagos
      break
    case 3:
      // Directorio: Directorio de Responsables
      if (formData.redemptionContactEmail && !isValidEmail(formData.redemptionContactEmail)) {
        newErrors.redemptionContactEmail = 'Email inválido'
      }
      break
    case 4:
      // Fiscales: Datos Fiscales y Ubicación
      // Optional fields, no strict validation
      break
    case 5:
      // Negocio: Reglas de Negocio
      // Optional fields, no strict validation
      break
    case 6:
      // Descripción: Descripción y Canales
      // No strict validation, all fields are optional
      break
    case 7:
      // Estructura: Estructura de Oferta
      // Validate pricing options: realValue must be greater than price, both must be positive
      const pricingOptionsToValidate = Array.isArray(formData.pricingOptions) ? formData.pricingOptions : []
      if (pricingOptionsToValidate.length > 0) {
        pricingOptionsToValidate.forEach((option, index) => {
          const price = parseFloat(option.price) || 0
          const realValue = parseFloat(option.realValue) || 0
          
          // Check required fields for each pricing option
          if (isRequired('pricingOptions.title') && isEmpty(option.title)) {
            newErrors[`pricingOptions.${index}.title`] = 'Título requerido'
          }
          if (isRequired('pricingOptions.description') && isEmpty(option.description)) {
            newErrors[`pricingOptions.${index}.description`] = 'Descripción requerida'
          }
          if (isRequired('pricingOptions.price') && isEmpty(option.price)) {
            newErrors[`pricingOptions.${index}.price`] = 'Precio requerido'
          }
          if (isRequired('pricingOptions.realValue') && isEmpty(option.realValue)) {
            newErrors[`pricingOptions.${index}.realValue`] = 'Valor real requerido'
          }
          if (isRequired('pricingOptions.quantity') && isEmpty(option.quantity)) {
            newErrors[`pricingOptions.${index}.quantity`] = 'Cantidad requerida'
          }
          if (isRequired('pricingOptions.limitByUser') && isEmpty(option.limitByUser)) {
            newErrors[`pricingOptions.${index}.limitByUser`] = 'Max Usuario requerido'
          }
          if (isRequired('pricingOptions.maxGiftsPerUser') && isEmpty(option.maxGiftsPerUser)) {
            newErrors[`pricingOptions.${index}.maxGiftsPerUser`] = 'Max Regalo requerido'
          }
          if (isRequired('pricingOptions.endAt') && isEmpty(option.endAt)) {
            newErrors[`pricingOptions.${index}.endAt`] = 'Fecha fin requerida'
          }
          if (isRequired('pricingOptions.expiresIn') && isEmpty(option.expiresIn)) {
            newErrors[`pricingOptions.${index}.expiresIn`] = 'Vencimiento requerido'
          }
          
          // If both values are provided and > 0, validate
          if (price > 0 && realValue > 0) {
            if (realValue <= price) {
              newErrors[`pricingOptions.${index}.realValue`] = 'El valor real debe ser mayor que el precio'
            }
          }
          
          // Ensure both are positive if provided
          if (option.price && parseFloat(option.price) <= 0) {
            newErrors[`pricingOptions.${index}.price`] = 'El precio debe ser mayor que 0'
          }
          if (option.realValue && parseFloat(option.realValue) <= 0) {
            newErrors[`pricingOptions.${index}.realValue`] = 'El valor real debe ser mayor que 0'
          }
        })
      }
      break
    case 8:
      // Políticas: Políticas y Revisión
      // Optional fields, no strict validation
      break
    case 9:
      // Información Adicional: Información Adicional (Category-specific)
      // All fields are optional
      break
  }

  return newErrors
}

export const buildFormDataForSubmit = (formData: BookingFormData): FormData => {
  const fd = new FormData()
  
  // Map enhanced form fields to booking request fields
  fd.append('name', formData.businessName)  // Event name from business name
  fd.append('merchant', formData.businessName)  // Merchant name
  fd.append('businessEmail', formData.partnerEmail)  // Email del Comercio
  fd.append('additionalEmails', JSON.stringify(formData.additionalEmails || []))  // Additional emails
  fd.append('startDate', formData.startDate)
  fd.append('endDate', formData.endDate)
  fd.append('category', formData.category || '')
  fd.append('parentCategory', formData.parentCategory || '')
  fd.append('subCategory1', formData.subCategory1 || '')
  fd.append('subCategory2', formData.subCategory2 || '')
  fd.append('subCategory3', formData.subCategory3 || '')
  if (formData.opportunityId) {
    fd.append('opportunityId', formData.opportunityId)
  }
  
  // Configuración: Configuración General y Vigencia
  fd.append('campaignDuration', formData.campaignDuration || '')
  
  // Operatividad: Operatividad y Pagos
  fd.append('redemptionMode', formData.redemptionMode || '')
  fd.append('isRecurring', formData.isRecurring || '')
  fd.append('recurringOfferLink', formData.recurringOfferLink || '')
  fd.append('paymentType', formData.paymentType || '')
  fd.append('paymentInstructions', formData.paymentInstructions || '')
  
  // Directorio: Directorio de Responsables
  fd.append('redemptionContactName', formData.redemptionContactName || '')
  fd.append('redemptionContactEmail', formData.redemptionContactEmail || '')
  fd.append('redemptionContactPhone', formData.redemptionContactPhone || '')
  
  // Fiscales: Datos Fiscales, Bancarios y de Ubicación
  fd.append('legalName', formData.legalName || '')
  fd.append('rucDv', formData.rucDv || '')
  fd.append('bankAccountName', formData.bankAccountName || '')
  fd.append('bank', formData.bank || '')
  fd.append('accountNumber', formData.accountNumber || '')
  fd.append('accountType', formData.accountType || '')
  fd.append('addressAndHours', formData.addressAndHours || '')
  fd.append('province', formData.province || '')
  fd.append('district', formData.district || '')
  fd.append('corregimiento', formData.corregimiento || '')
  
  // Negocio: Reglas de Negocio y Restricciones
  fd.append('includesTaxes', formData.includesTaxes || '')
  fd.append('validOnHolidays', formData.validOnHolidays || '')
  fd.append('hasExclusivity', formData.hasExclusivity || '')
  fd.append('blackoutDates', formData.blackoutDates || '')
  fd.append('exclusivityCondition', formData.exclusivityCondition || '')
  fd.append('giftVouchers', formData.giftVouchers || '')
  fd.append('hasOtherBranches', formData.hasOtherBranches || '')
  fd.append('vouchersPerPerson', formData.vouchersPerPerson || '')
  fd.append('commission', formData.commission || '')
  
  // Descripción: Descripción y Canales de Venta
  fd.append('redemptionMethods', JSON.stringify(formData.redemptionMethods || []))
  fd.append('contactDetails', formData.contactDetails || '')
  fd.append('socialMedia', formData.socialMedia || '')
  
  // Contenido: AI-Generated Content Fields
  fd.append('shortTitle', formData.shortTitle || '')
  fd.append('whatWeLike', formData.whatWeLike || '')
  fd.append('aboutCompany', formData.aboutCompany || '')
  fd.append('aboutOffer', formData.aboutOffer || '')
  fd.append('goodToKnow', formData.goodToKnow || '')
  
  // Estructura: Estructura de la Oferta
  fd.append('offerMargin', formData.offerMargin || '')
  fd.append('pricingOptions', JSON.stringify(formData.pricingOptions || []))
  fd.append('dealImages', JSON.stringify(formData.dealImages || []))
  
  // Políticas: Políticas Generales
  fd.append('cancellationPolicy', formData.cancellationPolicy || '')
  fd.append('marketValidation', formData.marketValidation || '')
  fd.append('additionalComments', formData.additionalComments || '')
  
  // Información Adicional: Build dynamic additionalInfo JSON
  const templateName = getTemplateName(
    formData.parentCategory,
    formData.subCategory1,
    formData.subCategory2,
    formData.category
  )
  
  if (templateName && FIELD_TEMPLATES[templateName]) {
    const template = FIELD_TEMPLATES[templateName]
    const fields: Record<string, string> = {}
    
    // Collect all field values from the template
    template.fields.forEach(fieldConfig => {
      const value = formData[fieldConfig.name as keyof BookingFormData]
      if (value !== undefined && value !== '') {
        fields[fieldConfig.name] = String(value)
      }
    })
    
    // Only include if there are fields with values
    if (Object.keys(fields).length > 0) {
      const additionalInfo = {
        templateName,
        templateDisplayName: template.displayName,
        fields
      }
      fd.append('additionalInfo', JSON.stringify(additionalInfo))
    }
  }
  
  // Note: description field has been removed - all data is now stored in individual fields
  
  return fd
}

