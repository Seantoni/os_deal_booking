import type { SectionDefinition } from '@/types'

export const SECTION_TITLES = {
  GENERAL_INFO: 'Información General',
  CAMPAIGN_DETAILS: 'Duración de la Campaña',
  REDEMPTION_METHOD: 'Método de Canje',
  PRICING_OPTIONS: 'Opciones de Compra',
  CLIENT_CONTACT: 'Detalles de Contacto (cliente)',
  ADDITIONAL_INFO: 'Información Adicional',
  COMPLEMENTARY_INFO: 'Información Complementaria',
  INTERNAL_REVIEW: 'Comentarios y Validación Interna',
} as const

export const BASE_SECTIONS: SectionDefinition[] = [
  {
    title: SECTION_TITLES.GENERAL_INFO,
    fields: [
      { key: 'name', label: 'Nombre del Negocio' },
      { key: 'businessEmail', label: 'Email del Negocio' },
      { key: 'parentCategory', label: 'Categoría' },
      { key: 'subCategory1', label: 'Subcategoría 1' },
      { key: 'subCategory2', label: 'Subcategoría 2' },
      { key: 'subCategory3', label: 'Subcategoría 3' },
      { key: 'merchant', label: 'Merchant/Aliado' },
      { key: 'isRecurring', label: 'Es Recurrente' },
      { key: 'recurringOfferLink', label: 'Enlace de Oferta Recurrente' },
    ],
  },
  {
    title: SECTION_TITLES.CAMPAIGN_DETAILS,
    fields: [
      { key: 'startDate', label: 'Fecha de Inicio (Tentativa)', type: 'date' },
      { key: 'endDate', label: 'Fecha de Fin (Tentativa)', type: 'date' },
      { key: 'campaignDuration', label: 'Duración de la Campaña' },
      { key: 'eventDays', label: 'Días del Evento', type: 'json' },
    ],
  },
  {
    title: 'Información Fiscal y Bancaria',
    fields: [
      { key: 'legalName', label: 'Razón Social' },
      { key: 'rucDv', label: 'RUC y DV' },
      { key: 'bankAccountName', label: 'Nombre en Cuenta Bancaria' },
      { key: 'bank', label: 'Banco' },
      { key: 'accountNumber', label: 'Número de Cuenta' },
      { key: 'accountType', label: 'Tipo de Cuenta' },
      { key: 'additionalBankAccounts', label: 'Cuentas Bancarias Adicionales', type: 'json' },
      { key: 'paymentType', label: 'Tipo de Pago' },
      { key: 'paymentInstructions', label: 'Instrucciones de Pago' },
      { key: 'addressAndHours', label: 'Dirección y Horario' },
      { key: 'provinceDistrictCorregimiento', label: 'Provincia, Distrito, Corregimiento' },
    ],
  },
  {
    title: SECTION_TITLES.REDEMPTION_METHOD,
    fields: [
      { key: 'redemptionMode', label: 'Modalidad de Canje' },
      { key: 'redemptionMethods', label: 'Métodos de Canje', type: 'json' },
    ],
  },
  {
    title: SECTION_TITLES.PRICING_OPTIONS,
    fields: [
      { key: 'offerMargin', label: 'Comisión OfertaSimple (%)' },
      { key: 'pricingOptions', label: 'Opciones de Compra', type: 'pricing' },
      { key: 'dealImages', label: 'Galería de Imágenes', type: 'gallery' },
      { key: 'bookingAttachments', label: 'Adjuntos', type: 'attachments' },
    ],
  },
  {
    title: SECTION_TITLES.CLIENT_CONTACT,
    fields: [
      { key: 'contactDetails', label: 'Detalles de Contacto (cliente)' },
      { key: 'socialMedia', label: 'Redes Sociales' },
    ],
  },
  {
    title: 'Directorio de Contactos',
    fields: [
      { key: 'redemptionContactName', label: 'Nombre del Contacto de Canje', type: 'contact' },
      { key: 'redemptionContactEmail', label: 'Email del Contacto de Canje', type: 'contact' },
      { key: 'redemptionContactPhone', label: 'Teléfono del Contacto de Canje', type: 'contact' },
      { key: 'additionalRedemptionContacts', label: 'Contactos Adicionales de Canje', type: 'contacts' },
    ],
  },
  {
    title: 'Reglas de Negocio y Restricciones',
    fields: [
      { key: 'includesTaxes', label: 'Incluye Impuestos' },
      { key: 'validOnHolidays', label: 'Válido en Feriados' },
      { key: 'hasExclusivity', label: 'Tiene Exclusividad' },
      { key: 'exclusivityCondition', label: 'Condición de Exclusividad' },
      { key: 'blackoutDates', label: 'Fechas Blackout' },
      { key: 'hasOtherBranches', label: 'Tiene Otras Sucursales' },
    ],
  },
  {
    title: 'Contenido (IA)',
    fields: [
      { key: 'nameEs', label: 'Título de la oferta' },
      { key: 'shortTitle', label: 'Título corto' },
      { key: 'emailTitle', label: 'Título del email' },
      { key: 'aboutOffer', label: 'Acerca de esta oferta' },
      { key: 'whatWeLike', label: 'Lo que nos gusta' },
      { key: 'goodToKnow', label: 'Lo que conviene saber' },
      { key: 'howToUseEs', label: 'Cómo usar' },
    ],
  },
  {
    title: SECTION_TITLES.ADDITIONAL_INFO,
    fields: [
      { key: 'cancellationPolicy', label: 'Política de Cancelación' },
    ],
  },
  {
    title: SECTION_TITLES.INTERNAL_REVIEW,
    fields: [
      { key: 'marketValidation', label: 'Validación de Mercado' },
      { key: 'additionalComments', label: 'Comentarios Adicionales' },
    ],
  },
  {
    title: 'Estado de la Solicitud',
    fields: [
      { key: 'status', label: 'Estado' },
      { key: 'sourceType', label: 'Tipo de Origen' },
      { key: 'originExternalDealId', label: 'Deal Histórico' },
      { key: 'originExternalDealName', label: 'Nombre del Deal Histórico' },
      { key: 'processedAt', label: 'Procesado En', type: 'date' },
      { key: 'processedBy', label: 'Procesado Por' },
      { key: 'rejectionReason', label: 'Razón del Rechazo' },
    ],
  },
]
