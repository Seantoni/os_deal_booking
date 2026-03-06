import {
  FIELD_TEMPLATES,
  type FieldTemplate,
} from '@/components/RequestForm/config/field-templates'
import type { BookingFormData } from '@/components/RequestForm/types'
import {
  PANAMA_TIMEZONE,
  formatDateForDisplay,
  formatRequestNameDate,
  parseDateInPanamaTime,
} from '@/lib/date'
import type {
  AdditionalInfo,
  BookingRequestViewData,
  FieldComment,
  SectionDefinition,
} from '@/types'
import { SECTION_TITLES } from './bookingRequestView.config'
import type { AdditionalSectionData, BookingAttachmentItem } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

function slugifyLabel(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'field'
  )
}

function resolveBookingRequestDate(value: Date | string): Date {
  if (typeof value === 'string' && isDateOnlyString(value)) {
    return parseDateInPanamaTime(value)
  }

  return value instanceof Date ? value : new Date(value)
}

export function formatBookingRequestShortDate(value: Date | string | null | undefined): string {
  if (!value) return '—'

  const date = resolveBookingRequestDate(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('es-ES', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getFieldValue(data: BookingRequestViewData | null, key: string): unknown {
  if (!data) return undefined
  return (data as unknown as Record<string, unknown>)[key]
}

export function getCommentAuthorDisplayName(comment: FieldComment): string {
  return comment.authorName || comment.authorEmail?.split('@')[0] || 'usuario'
}

export function getCommentAuthorLabel(comment: FieldComment): string {
  return comment.authorName || comment.authorEmail?.split('@')[0] || 'Usuario'
}

export function getFieldContainerId(fieldKey: string): string {
  return `booking-field-${fieldKey}`
}

export function getInlineCommentId(commentId: string): string {
  return `booking-field-comment-${commentId}`
}

export function normalizeBookingAttachments(value: unknown): BookingAttachmentItem[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .map((item) => ({
      url: String(item.url || '').trim(),
      filename: String(item.filename || '').trim(),
      mimeType: String(item.mimeType || '').trim(),
      size: Number(item.size || 0),
    }))
    .filter((item) => item.url.length > 0)
}

export function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }

  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function isImageAttachment(mimeType: string, filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  return mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
}

export function getAttachmentLabel(mimeType: string, filename: string): string {
  const extension = filename.split('.').pop()?.toUpperCase() || ''

  if (isImageAttachment(mimeType, filename)) return extension || 'Imagen'
  if (mimeType === 'application/pdf' || extension === 'PDF') return 'PDF'
  if (mimeType.includes('word') || extension === 'DOC' || extension === 'DOCX') return extension || 'DOC'

  return extension || 'Archivo'
}

export function sanitizeFilenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getImageExtension(url: string, mimeType?: string): string {
  const normalizedMime = (mimeType || '').toLowerCase()

  if (normalizedMime === 'image/jpeg') return 'jpg'
  if (normalizedMime === 'image/png') return 'png'
  if (normalizedMime === 'image/webp') return 'webp'
  if (normalizedMime === 'image/gif') return 'gif'
  if (normalizedMime === 'image/svg+xml') return 'svg'

  const cleanedUrl = url.split('?')[0]?.split('#')[0] || ''
  const extension = cleanedUrl.split('.').pop()?.toLowerCase() || ''

  if (/^[a-z0-9]{2,5}$/.test(extension)) {
    return extension === 'jpeg' ? 'jpg' : extension
  }

  return 'jpg'
}

export function formatBookingRequestFieldValue(
  value: unknown,
  type: string | undefined,
  fieldKey: string | undefined,
  campaignDurationUnit: BookingRequestViewData['campaignDurationUnit']
): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (fieldKey === 'campaignDuration') {
    const duration = String(value).trim()
    const durationNumber = Number.parseInt(duration, 10)
    const unit = campaignDurationUnit === 'days' ? 'days' : 'months'
    const label =
      unit === 'days'
        ? durationNumber === 1
          ? 'día'
          : 'días'
        : durationNumber === 1
          ? 'mes'
          : 'meses'

    return `${duration} ${label}`
  }

  if (type === 'date' && (value instanceof Date || typeof value === 'string')) {
    const date = resolveBookingRequestDate(value)
    return Number.isNaN(date.getTime()) ? String(value) : formatDateForDisplay(date, 'es-ES')
  }

  if (fieldKey === 'eventDays' && Array.isArray(value)) {
    return value
      .filter((date): date is string => typeof date === 'string' && date.trim().length > 0)
      .map((date) => {
        const parsedDate = parseDateInPanamaTime(date.trim())
        return Number.isNaN(parsedDate.getTime()) ? date.trim() : formatRequestNameDate(parsedDate)
      })
      .join('\n')
  }

  if (fieldKey === 'additionalBankAccounts' && Array.isArray(value)) {
    const lines = value
      .filter(isRecord)
      .map((account, index) => {
        const bankAccountName = String(account.bankAccountName || '').trim()
        const bank = String(account.bank || '').trim()
        const accountNumber = String(account.accountNumber || '').trim()
        const accountType = String(account.accountType || '').trim()
        const details = [
          bankAccountName ? `Titular: ${bankAccountName}` : null,
          bank ? `Banco: ${bank}` : null,
          accountNumber ? `Cuenta: ${accountNumber}` : null,
          accountType ? `Tipo: ${accountType}` : null,
        ].filter(Boolean)

        if (details.length === 0) return null
        return `Cuenta ${index + 1}: ${details.join(' | ')}`
      })
      .filter((line): line is string => !!line)

    return lines.length > 0 ? lines.join('\n') : '-'
  }

  if (type === 'json' && Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
      .join(', ')
  }

  if (type === 'pricing' && Array.isArray(value)) {
    return value
      .map((opt: { title?: string; price?: number }) => `${opt.title || 'Option'}: $${opt.price || 0}`)
      .join(' | ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  const str = String(value)

  if (type === 'description') {
    const withoutAdditional = str.split('=== INFORMACIÓN ADICIONAL')[0]?.trim()
    return withoutAdditional || str
  }

  return str
}

export function buildAdditionalInfoSection(additionalInfo: AdditionalInfo | null): AdditionalSectionData | null {
  if (!additionalInfo || !isRecord(additionalInfo)) return null

  const templateName = String(additionalInfo.templateName || additionalInfo.templateDisplayName || '')
  const template = templateName
    ? ((FIELD_TEMPLATES as Record<string, FieldTemplate | undefined>)[templateName] ?? null)
    : null
  const sourceFields = additionalInfo.fields || {}
  const entries = Object.entries(sourceFields)

  if (entries.length === 0) return null

  const fieldLabelMap = new Map<string, string>()
  if (template) {
    template.fields.forEach((field: { name: string; label: string }) => {
      fieldLabelMap.set(field.name, field.label)
    })
  }

  const sectionFields = entries.map(([fieldName]) => {
    const label = fieldLabelMap.get(fieldName) || fieldName
    return {
      key: `additional_${fieldName}`,
      label,
    }
  })

  const values: Record<string, string> = {}
  const legacyCommentFieldKeyMap: Record<string, string> = {}

  entries.forEach(([, value], index) => {
    const sectionField = sectionFields[index]
    values[sectionField.key] = String(value ?? '')
    legacyCommentFieldKeyMap[`additional_${slugifyLabel(sectionField.label)}`] = sectionField.key
  })

  return {
    section: {
      title:
        SECTION_TITLES.ADDITIONAL_INFO +
        (additionalInfo.templateDisplayName ? ` (${additionalInfo.templateDisplayName})` : ''),
      fields: sectionFields,
    },
    values,
    legacyCommentFieldKeyMap,
  }
}

export function remapCommentsToDisplayKeys(
  comments: FieldComment[],
  legacyCommentFieldKeyMap: Record<string, string>
): FieldComment[] {
  if (Object.keys(legacyCommentFieldKeyMap).length === 0) return comments

  return comments.map((comment) => {
    const mappedFieldKey = legacyCommentFieldKeyMap[comment.fieldKey]
    if (!mappedFieldKey || mappedFieldKey === comment.fieldKey) return comment

    return {
      ...comment,
      fieldKey: mappedFieldKey,
    }
  })
}

export function getFieldLabelByKey(sections: SectionDefinition[], fieldKey: string): string {
  return (
    sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === fieldKey)?.label || fieldKey
  )
}

export function buildBookingRequestReplicatePayload(requestData: BookingRequestViewData): {
  payload: Partial<BookingFormData> & { linkedBusinessId?: string }
  additionalInfo: AdditionalInfo | null
} {
  const businessName = requestData.name ? String(requestData.name).split(' | ')[0].trim() : ''

  const payload: Partial<BookingFormData> & { linkedBusinessId?: string } = {
    businessName: businessName || '',
    partnerEmail: requestData.businessEmail ? String(requestData.businessEmail) : '',
    additionalEmails: Array.isArray(requestData.additionalEmails) ? requestData.additionalEmails : [],
    category: requestData.category ? String(requestData.category) : '',
    parentCategory: requestData.parentCategory ? String(requestData.parentCategory) : '',
    subCategory1: requestData.subCategory1 ? String(requestData.subCategory1) : '',
    subCategory2: requestData.subCategory2 ? String(requestData.subCategory2) : '',
    subCategory3: requestData.subCategory3 ? String(requestData.subCategory3) : '',
    campaignDuration: requestData.campaignDuration ? String(requestData.campaignDuration) : '',
    campaignDurationUnit: (requestData.campaignDurationUnit as 'days' | 'months') || 'months',
    eventDays: Array.isArray(requestData.eventDays)
      ? requestData.eventDays
          .filter((date): date is string => typeof date === 'string')
          .map((date) => date.trim())
          .filter((date) => date.length > 0)
      : [],
    linkedBusinessId: requestData.linkedBusiness?.id || undefined,
    redemptionMode: requestData.redemptionMode ? String(requestData.redemptionMode) : undefined,
    isRecurring: requestData.isRecurring ? String(requestData.isRecurring) : undefined,
    recurringOfferLink: requestData.recurringOfferLink ? String(requestData.recurringOfferLink) : undefined,
    paymentType: requestData.paymentType ? String(requestData.paymentType) : undefined,
    paymentInstructions: requestData.paymentInstructions ? String(requestData.paymentInstructions) : undefined,
    redemptionContactName: requestData.redemptionContactName ? String(requestData.redemptionContactName) : undefined,
    redemptionContactEmail: requestData.redemptionContactEmail ? String(requestData.redemptionContactEmail) : undefined,
    redemptionContactPhone: requestData.redemptionContactPhone ? String(requestData.redemptionContactPhone) : undefined,
    legalName: requestData.legalName ? String(requestData.legalName) : undefined,
    rucDv: requestData.rucDv ? String(requestData.rucDv) : undefined,
    bankAccountName: requestData.bankAccountName ? String(requestData.bankAccountName) : undefined,
    bank: requestData.bank ? String(requestData.bank) : undefined,
    accountNumber: requestData.accountNumber ? String(requestData.accountNumber) : undefined,
    accountType: requestData.accountType ? String(requestData.accountType) : undefined,
    additionalBankAccounts: Array.isArray(requestData.additionalBankAccounts)
      ? requestData.additionalBankAccounts.map((account) => ({
          bankAccountName: String(account.bankAccountName || ''),
          bank: String(account.bank || ''),
          accountNumber: String(account.accountNumber || ''),
          accountType: String(account.accountType || ''),
        }))
      : undefined,
    addressAndHours: requestData.addressAndHours ? String(requestData.addressAndHours) : undefined,
    provinceDistrictCorregimiento: requestData.provinceDistrictCorregimiento
      ? String(requestData.provinceDistrictCorregimiento)
      : undefined,
    includesTaxes: requestData.includesTaxes ? String(requestData.includesTaxes) : undefined,
    validOnHolidays: requestData.validOnHolidays ? String(requestData.validOnHolidays) : undefined,
    hasExclusivity: requestData.hasExclusivity ? String(requestData.hasExclusivity) : undefined,
    blackoutDates: requestData.blackoutDates ? String(requestData.blackoutDates) : undefined,
    exclusivityCondition: requestData.exclusivityCondition ? String(requestData.exclusivityCondition) : undefined,
    hasOtherBranches: requestData.hasOtherBranches ? String(requestData.hasOtherBranches) : undefined,
    redemptionMethods: Array.isArray(requestData.redemptionMethods) ? requestData.redemptionMethods : undefined,
    contactDetails: requestData.contactDetails ? String(requestData.contactDetails) : undefined,
    socialMedia: requestData.socialMedia ? String(requestData.socialMedia) : undefined,
    nameEs: requestData.nameEs ? String(requestData.nameEs) : undefined,
    shortTitle: requestData.shortTitle ? String(requestData.shortTitle) : undefined,
    emailTitle: requestData.emailTitle ? String(requestData.emailTitle) : undefined,
    whatWeLike: requestData.whatWeLike ? String(requestData.whatWeLike) : undefined,
    aboutCompany: requestData.aboutCompany ? String(requestData.aboutCompany) : undefined,
    aboutOffer: requestData.aboutOffer ? String(requestData.aboutOffer) : undefined,
    goodToKnow: requestData.goodToKnow ? String(requestData.goodToKnow) : undefined,
    howToUseEs: requestData.howToUseEs ? String(requestData.howToUseEs) : undefined,
    offerMargin: requestData.offerMargin ? String(requestData.offerMargin) : undefined,
    pricingOptions: Array.isArray(requestData.pricingOptions)
      ? requestData.pricingOptions.map((opt) => ({
          title: opt.title,
          description: opt.description ?? '',
          price: String(opt.price ?? ''),
          realValue: String(opt.realValue ?? ''),
          quantity: String(opt.quantity ?? ''),
          imageUrl: opt.imageUrl ?? '',
          limitByUser: opt.limitByUser != null ? String(opt.limitByUser) : '',
          maxGiftsPerUser: opt.maxGiftsPerUser != null ? String(opt.maxGiftsPerUser) : '',
          endAt: opt.endAt ?? '',
          expiresIn: opt.expiresIn != null ? String(opt.expiresIn) : '',
        }))
      : undefined,
    dealImages: Array.isArray(requestData.dealImages) ? requestData.dealImages : undefined,
    cancellationPolicy: requestData.cancellationPolicy ? String(requestData.cancellationPolicy) : undefined,
    marketValidation: requestData.marketValidation ? String(requestData.marketValidation) : undefined,
    additionalComments: requestData.additionalComments ? String(requestData.additionalComments) : undefined,
  }

  const additionalInfo = isRecord(requestData.additionalInfo) ? requestData.additionalInfo : null

  return {
    payload,
    additionalInfo,
  }
}

export function persistBookingRequestReplicatePayload(requestData: BookingRequestViewData): string {
  const { payload, additionalInfo } = buildBookingRequestReplicatePayload(requestData)
  const replicateKey = `${Date.now()}_${Math.random().toString(16).slice(2)}`

  sessionStorage.setItem(`replicate:${replicateKey}`, JSON.stringify(payload))
  if (additionalInfo) {
    sessionStorage.setItem(`replicate:${replicateKey}:additionalInfo`, JSON.stringify(additionalInfo))
  }

  return replicateKey
}
