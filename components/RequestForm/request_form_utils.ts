import type { BookingFormData } from './types'
import type { RequestFormFieldsConfig } from '@/types'
import { isValidEmail } from '@/lib/utils/validation'
import { FIELD_TEMPLATES, getTemplateName } from './config'
import { REQUEST_FORM_STEPS } from '@/lib/config/request-form-fields'

export const validateStep = (
  step: number,
  formData: BookingFormData,
  requiredFields?: RequestFormFieldsConfig
): Record<string, string> => {
  const newErrors: Record<string, string> = {}
  const isRequired = (fieldKey: string) => requiredFields?.[fieldKey]?.required === true
  const templateName = getTemplateName(
    formData.parentCategory,
    formData.subCategory1,
    formData.subCategory2,
    formData.category
  )

  const stepDef = REQUEST_FORM_STEPS.find((s) => s.id === step)

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

  const isEmpty = (value: any) => {
    if (Array.isArray(value)) return value.length === 0
    if (value === undefined || value === null) return true
    if (typeof value === 'string') return value.trim().length === 0
    return false
  }

  // Generic required-field validation for the current step
  if (stepDef) {
    stepDef.fields.forEach((field) => {
      if (!shouldValidateField(field.key)) return
      const value = (formData as any)[field.key]
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
      if (formData.businessReview && formData.businessReview.length > 300) {
        newErrors.businessReview = 'Máximo 300 caracteres'
      }
      break
    case 7:
      // Estructura: Estructura de Oferta
      // Validate pricing options: realValue must be greater than price, both must be positive
      const pricingOptionsToValidate = Array.isArray(formData.pricingOptions) ? formData.pricingOptions : []
      if (pricingOptionsToValidate.length > 0) {
        pricingOptionsToValidate.forEach((option, index) => {
          const price = parseFloat(option.price) || 0
          const realValue = parseFloat(option.realValue) || 0
          
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
  fd.append('businessReview', formData.businessReview || '')
  fd.append('offerDetails', formData.offerDetails || '')
  
  // Estructura: Estructura de la Oferta
  fd.append('pricingOptions', JSON.stringify(formData.pricingOptions || []))
  
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
      const value = (formData as any)[fieldConfig.name]
      if (value !== undefined && value !== '') {
        fields[fieldConfig.name] = value
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
  
  // Build comprehensive description from all fields (for backward compatibility)
  const descriptionParts = []
  
  // Configuración: Configuración General y Vigencia (merged)
  // (Fields removed: advisorEmail, assignedAdvisor, salesType)
  if (formData.campaignDuration) descriptionParts.push(`Duración de Campaña: ${formData.campaignDuration}`)
  
  // Operatividad: Operatividad y Pagos
  if (formData.redemptionMode) descriptionParts.push(`Modalidad de Canje: ${formData.redemptionMode}`)
  if (formData.isRecurring) descriptionParts.push(`Recurrencia: ${formData.isRecurring}`)
  if (formData.recurringOfferLink) descriptionParts.push(`Enlace Recurrente: ${formData.recurringOfferLink}`)
  if (formData.paymentType) descriptionParts.push(`Tipo de Pago: ${formData.paymentType}`)
  if (formData.paymentInstructions) descriptionParts.push(`Instrucciones de Pago: ${formData.paymentInstructions}`)
  
  // Directorio: Directorio de Responsables
  if (formData.redemptionContactName || formData.redemptionContactEmail || formData.redemptionContactPhone) {
    descriptionParts.push('\n\nContacto de Canje:')
    if (formData.redemptionContactName) descriptionParts.push(`Nombre: ${formData.redemptionContactName}`)
    if (formData.redemptionContactEmail) descriptionParts.push(`Email: ${formData.redemptionContactEmail}`)
    if (formData.redemptionContactPhone) descriptionParts.push(`Teléfono: ${formData.redemptionContactPhone}`)
  }
  
  // Fiscales: Datos Fiscales y Ubicación
  if (formData.legalName || formData.rucDv || formData.bank || formData.accountNumber) {
    descriptionParts.push('\n\nDatos Fiscales y Bancarios:')
    if (formData.legalName) descriptionParts.push(`Razón Social: ${formData.legalName}`)
    if (formData.rucDv) descriptionParts.push(`RUC y DV: ${formData.rucDv}`)
    if (formData.bankAccountName) descriptionParts.push(`Cuenta Bancaria: ${formData.bankAccountName}`)
    if (formData.bank) descriptionParts.push(`Banco: ${formData.bank}`)
    if (formData.accountNumber) descriptionParts.push(`Número de Cuenta: ${formData.accountNumber}`)
    if (formData.accountType) descriptionParts.push(`Tipo de Cuenta: ${formData.accountType}`)
    if (formData.addressAndHours) descriptionParts.push(`Dirección y Horario: ${formData.addressAndHours}`)
    if (formData.province || formData.district || formData.corregimiento) {
      descriptionParts.push(`Ubicación: ${formData.province || ''}${formData.district ? ', ' + formData.district : ''}${formData.corregimiento ? ', ' + formData.corregimiento : ''}`)
    }
  }
  
  // Negocio: Reglas de Negocio
  if (formData.includesTaxes || formData.validOnHolidays || formData.hasExclusivity || formData.commission) {
    descriptionParts.push('\n\nReglas de Negocio:')
    if (formData.includesTaxes) descriptionParts.push(`Impuestos: ${formData.includesTaxes}`)
    if (formData.validOnHolidays) descriptionParts.push(`Válido en Feriados: ${formData.validOnHolidays}`)
    if (formData.hasExclusivity) descriptionParts.push(`Exclusividad: ${formData.hasExclusivity}`)
    if (formData.blackoutDates) descriptionParts.push(`Fechas Blackout: ${formData.blackoutDates}`)
    if (formData.exclusivityCondition) descriptionParts.push(`Condición Exclusividad: ${formData.exclusivityCondition}`)
    if (formData.giftVouchers) descriptionParts.push(`Vouchers para Regalar: ${formData.giftVouchers}`)
    if (formData.hasOtherBranches) descriptionParts.push(`Otra Sucursal: ${formData.hasOtherBranches}`)
    if (formData.vouchersPerPerson) descriptionParts.push(`Vouchers por Persona: ${formData.vouchersPerPerson}`)
    if (formData.commission) descriptionParts.push(`Comisión: ${formData.commission}`)
  }
  
  // Descripción: Descripción y Canales
  if (formData.contactDetails) descriptionParts.push(`Contacto para Canje: ${formData.contactDetails}`)
  if (formData.socialMedia) descriptionParts.push(`Redes Sociales: ${formData.socialMedia}`)
  if (formData.businessReview) descriptionParts.push(`\n\nReseña del Negocio:\n${formData.businessReview}`)
  if (formData.offerDetails) descriptionParts.push(`\n\nDetalle del Contenido:\n${formData.offerDetails}`)
  
  // Estructura: Estructura de Oferta
  const pricingOptionsForSubmit = Array.isArray(formData.pricingOptions) ? formData.pricingOptions : []
  if (pricingOptionsForSubmit.length > 0) {
    descriptionParts.push('\n\nOpciones de Precio:')
    pricingOptionsForSubmit.forEach((opt, i) => {
      if (opt.title || opt.description) {
        descriptionParts.push(`\n${i + 1}. ${opt.title || `Opción ${i + 1}`}`)
        if (opt.description) descriptionParts.push(`   ${opt.description}`)
        if (opt.price && opt.realValue) {
          descriptionParts.push(`   Paga $${opt.price} y consume $${opt.realValue}`)
        }
        if (opt.quantity) descriptionParts.push(`   Cantidad: ${opt.quantity}`)
      }
    })
  }
  
  // Políticas: Políticas y Revisión
  if (formData.cancellationPolicy) descriptionParts.push(`\n\nPolíticas de Cancelación:\n${formData.cancellationPolicy}`)
  if (formData.marketValidation) descriptionParts.push(`Validación de Mercado: ${formData.marketValidation}`)
  if (formData.additionalComments) descriptionParts.push(`\n\nComentarios Finales:\n${formData.additionalComments}`)
  
  fd.append('description', descriptionParts.join('\n'))
  
  return fd
}

