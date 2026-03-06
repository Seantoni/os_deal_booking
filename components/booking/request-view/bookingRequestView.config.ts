import type { SectionDefinition } from '@/types'

export const SECTION_TITLES = {
  GENERAL_INFO: 'Información General',
  CAMPAIGN_DETAILS: 'Detalles de la Campaña',
  PRICING_OPTIONS: 'Opciones de Precio',
  ADDITIONAL_INFO: 'Información Adicional',
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
    title: 'Operaciones y Pagos',
    fields: [
      { key: 'redemptionMode', label: 'Modalidad de Canje' },
      { key: 'isRecurring', label: 'Es Recurrente' },
      { key: 'recurringOfferLink', label: 'Enlace de Oferta Recurrente' },
      { key: 'paymentType', label: 'Tipo de Pago' },
      { key: 'paymentInstructions', label: 'Instrucciones de Pago' },
    ],
  },
  {
    title: 'Directorio de Contactos',
    fields: [
      { key: 'redemptionContactName', label: 'Nombre del Contacto de Canje' },
      { key: 'redemptionContactEmail', label: 'Email del Contacto de Canje' },
      { key: 'redemptionContactPhone', label: 'Teléfono del Contacto de Canje' },
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
    ],
  },
  {
    title: 'Ubicación',
    fields: [
      { key: 'addressAndHours', label: 'Dirección y Horario' },
      { key: 'provinceDistrictCorregimiento', label: 'Provincia, Distrito, Corregimiento' },
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
    title: 'Descripción y Canales de Venta',
    fields: [
      { key: 'redemptionMethods', label: 'Métodos de Canje', type: 'json' },
      { key: 'contactDetails', label: 'Detalles de Contacto' },
      { key: 'socialMedia', label: 'Redes Sociales' },
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
    title: SECTION_TITLES.PRICING_OPTIONS,
    fields: [
      { key: 'offerMargin', label: 'Comisión OfertaSimple (%)' },
      { key: 'pricingOptions', label: 'Opciones de Precio', type: 'pricing' },
      { key: 'dealImages', label: 'Galería de Imágenes', type: 'gallery' },
      { key: 'bookingAttachments', label: 'Adjuntos', type: 'attachments' },
    ],
  },
  {
    title: 'Políticas Generales',
    fields: [
      { key: 'cancellationPolicy', label: 'Política de Cancelación' },
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
