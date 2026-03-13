import type { BookingFormData, BookingAttachment } from '@/components/RequestForm/types'

type PublicPrefillParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>

const PUBLIC_LINK_PREFILL_KEYS = [
  'businessName',
  'businessEmail',
  'partnerEmail',
  'additionalEmails',
  'paymentEmails',
  'category',
  'parentCategory',
  'subCategory1',
  'subCategory2',
  'subCategory3',
  'campaignDuration',
  'campaignDurationUnit',
  'startDate',
  'endDate',
  'eventDays',
  'redemptionMode',
  'isRecurring',
  'recurringOfferLink',
  'paymentType',
  'paymentPlan',
  'paymentInstructions',
  'redemptionContactName',
  'redemptionContactEmail',
  'redemptionContactPhone',
  'contactName',
  'contactPhone',
  'legalName',
  'ruc',
  'rucDv',
  'bankAccountName',
  'bank',
  'accountNumber',
  'accountType',
  'additionalBankAccounts',
  'address',
  'neighborhood',
  'addressAndHours',
  'provinceDistrictCorregimiento',
  'includesTaxes',
  'validOnHolidays',
  'hasExclusivity',
  'blackoutDates',
  'exclusivityCondition',
  'hasOtherBranches',
  'redemptionMethods',
  'contactDetails',
  'socialMedia',
  'website',
  'instagram',
  'description',
  'businessReview',
  'nameEs',
  'shortTitle',
  'emailTitle',
  'whatWeLike',
  'aboutCompany',
  'aboutOffer',
  'goodToKnow',
  'howToUseEs',
  'offerMargin',
  'pricingOptions',
  'dealImages',
  'cancellationPolicy',
  'marketValidation',
  'additionalComments',
  'additionalInfo',
] as const

function getParamValue(input: PublicPrefillParamsInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) {
    const value = input.get(key)
    return value === null ? undefined : value
  }

  const rawValue = input[key]
  if (Array.isArray(rawValue)) {
    return rawValue.find((value) => typeof value === 'string' && value.trim().length > 0)
  }

  return typeof rawValue === 'string' ? rawValue : undefined
}

function getTrimmedParamValue(input: PublicPrefillParamsInput, key: string): string | undefined {
  const value = getParamValue(input, key)
  if (!value) return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseJsonValue<T>(value: string | undefined): T | null {
  if (!value) return null

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function parseStringArray(value: string | undefined): string[] {
  const parsed = parseJsonValue<unknown>(value)
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function parseAdditionalBankAccounts(value: string | undefined): BookingFormData['additionalBankAccounts'] {
  const parsed = parseJsonValue<unknown>(value)
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      bankAccountName: String(item.bankAccountName || '').trim(),
      bank: String(item.bank || '').trim(),
      accountNumber: String(item.accountNumber || '').trim(),
      accountType: String(item.accountType || '').trim(),
    }))
    .filter((item) => Object.values(item).some((fieldValue) => fieldValue.length > 0))
}

function parseBookingAttachments(value: unknown): BookingAttachment[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      url: String(item.url || '').trim(),
      filename: String(item.filename || '').trim(),
      mimeType: String(item.mimeType || '').trim(),
      size: Number(item.size || 0),
    }))
    .filter((item) => item.url.length > 0)
}

export function sanitizePublicLinkPrefillParams(queryParams?: Record<string, string>): Record<string, string> {
  if (!queryParams) return {}

  const sanitizedEntries = PUBLIC_LINK_PREFILL_KEYS.flatMap((key) => {
    const value = queryParams[key]
    if (typeof value !== 'string') return []

    const trimmed = value.trim()
    if (!trimmed) return []

    return [[key, trimmed] as const]
  })

  return Object.fromEntries(sanitizedEntries)
}

export function buildPublicLinkPrefillSearchParams(
  recipientEmails: string[],
  queryParams?: Record<string, string>
): URLSearchParams {
  const params = new URLSearchParams()
  const sanitizedQueryParams = sanitizePublicLinkPrefillParams(queryParams)

  Object.entries(sanitizedQueryParams).forEach(([key, value]) => {
    params.set(key, value)
  })

  const validEmails = recipientEmails
    .map((email) => email.trim())
    .filter((email) => email.length > 0)

  if (validEmails.length > 0) {
    params.set('partnerEmail', validEmails[0])
  }

  if (validEmails.length > 1) {
    params.set('additionalEmails', JSON.stringify(validEmails.slice(1)))
  }

  return params
}

export function buildInitialFormDataFromPublicPrefill(
  input: PublicPrefillParamsInput
): Partial<BookingFormData> {
  const initialFormData: Partial<BookingFormData> = {}

  const businessName = getTrimmedParamValue(input, 'businessName')
  const partnerEmail = getTrimmedParamValue(input, 'partnerEmail') || getTrimmedParamValue(input, 'businessEmail')
  const contactName = getTrimmedParamValue(input, 'redemptionContactName') || getTrimmedParamValue(input, 'contactName')
  const contactPhone = getTrimmedParamValue(input, 'redemptionContactPhone') || getTrimmedParamValue(input, 'contactPhone')
  const contactEmail = getTrimmedParamValue(input, 'redemptionContactEmail') || partnerEmail
  const legalName = getTrimmedParamValue(input, 'legalName')
  const rucDv = getTrimmedParamValue(input, 'rucDv') || getTrimmedParamValue(input, 'ruc')
  const addressAndHours =
    getTrimmedParamValue(input, 'addressAndHours') ||
    [getTrimmedParamValue(input, 'address'), getTrimmedParamValue(input, 'neighborhood')]
      .filter((value): value is string => Boolean(value))
      .join(', ')
  const socialMedia =
    getTrimmedParamValue(input, 'socialMedia') ||
    [getTrimmedParamValue(input, 'instagram'), getTrimmedParamValue(input, 'website')]
      .filter((value): value is string => Boolean(value))
      .join(' | ')
  const contactDetails = getTrimmedParamValue(input, 'contactDetails') || getTrimmedParamValue(input, 'website')
  const businessReview = getTrimmedParamValue(input, 'businessReview') || getTrimmedParamValue(input, 'description')
  const paymentType = getTrimmedParamValue(input, 'paymentType') || getTrimmedParamValue(input, 'paymentPlan')

  if (businessName) initialFormData.businessName = businessName
  if (partnerEmail) initialFormData.partnerEmail = partnerEmail

  const additionalEmails = parseStringArray(getTrimmedParamValue(input, 'additionalEmails'))
  const fallbackPaymentEmails = parseStringArray(getTrimmedParamValue(input, 'paymentEmails'))
  if (additionalEmails.length > 0) {
    initialFormData.additionalEmails = additionalEmails
  } else if (fallbackPaymentEmails.length > 0) {
    initialFormData.additionalEmails = fallbackPaymentEmails
  }

  const category = getTrimmedParamValue(input, 'category')
  if (category) initialFormData.category = category

  const parentCategory = getTrimmedParamValue(input, 'parentCategory')
  if (parentCategory) initialFormData.parentCategory = parentCategory

  const subCategory1 = getTrimmedParamValue(input, 'subCategory1')
  if (subCategory1) initialFormData.subCategory1 = subCategory1

  const subCategory2 = getTrimmedParamValue(input, 'subCategory2')
  if (subCategory2) initialFormData.subCategory2 = subCategory2

  const subCategory3 = getTrimmedParamValue(input, 'subCategory3')
  if (subCategory3) initialFormData.subCategory3 = subCategory3

  const campaignDuration = getTrimmedParamValue(input, 'campaignDuration')
  if (campaignDuration) initialFormData.campaignDuration = campaignDuration

  const campaignDurationUnit = getTrimmedParamValue(input, 'campaignDurationUnit')
  if (campaignDurationUnit === 'days' || campaignDurationUnit === 'months') {
    initialFormData.campaignDurationUnit = campaignDurationUnit
  }

  const startDate = getTrimmedParamValue(input, 'startDate')
  if (startDate) initialFormData.startDate = startDate

  const endDate = getTrimmedParamValue(input, 'endDate')
  if (endDate) initialFormData.endDate = endDate

  const eventDays = parseStringArray(getTrimmedParamValue(input, 'eventDays'))
  if (eventDays.length > 0) {
    initialFormData.eventDays = eventDays
  }

  const redemptionMode = getTrimmedParamValue(input, 'redemptionMode')
  if (redemptionMode) initialFormData.redemptionMode = redemptionMode

  const isRecurring = getTrimmedParamValue(input, 'isRecurring')
  if (isRecurring) initialFormData.isRecurring = isRecurring

  const recurringOfferLink = getTrimmedParamValue(input, 'recurringOfferLink')
  if (recurringOfferLink) initialFormData.recurringOfferLink = recurringOfferLink

  if (paymentType) initialFormData.paymentType = paymentType

  const paymentInstructions = getTrimmedParamValue(input, 'paymentInstructions')
  if (paymentInstructions) initialFormData.paymentInstructions = paymentInstructions

  if (contactName) {
    initialFormData.redemptionContactName = contactName
    initialFormData.approverName = contactName
  }

  if (contactPhone) {
    initialFormData.redemptionContactPhone = contactPhone
  }

  if (contactEmail) {
    initialFormData.redemptionContactEmail = contactEmail
    initialFormData.approverEmail = contactEmail
  }

  if (legalName) {
    initialFormData.legalName = legalName
    initialFormData.approverBusinessName = legalName
  } else if (businessName) {
    initialFormData.approverBusinessName = businessName
  }

  if (rucDv) initialFormData.rucDv = rucDv

  const bankAccountName = getTrimmedParamValue(input, 'bankAccountName')
  if (bankAccountName) initialFormData.bankAccountName = bankAccountName

  const bank = getTrimmedParamValue(input, 'bank')
  if (bank) initialFormData.bank = bank

  const accountNumber = getTrimmedParamValue(input, 'accountNumber')
  if (accountNumber) initialFormData.accountNumber = accountNumber

  const accountType = getTrimmedParamValue(input, 'accountType')
  if (accountType) initialFormData.accountType = accountType

  const additionalBankAccounts = parseAdditionalBankAccounts(getTrimmedParamValue(input, 'additionalBankAccounts'))
  if (additionalBankAccounts.length > 0) {
    initialFormData.additionalBankAccounts = additionalBankAccounts
  }

  if (addressAndHours) initialFormData.addressAndHours = addressAndHours

  const provinceDistrictCorregimiento = getTrimmedParamValue(input, 'provinceDistrictCorregimiento')
  if (provinceDistrictCorregimiento) {
    initialFormData.provinceDistrictCorregimiento = provinceDistrictCorregimiento
  }

  const includesTaxes = getTrimmedParamValue(input, 'includesTaxes')
  if (includesTaxes) initialFormData.includesTaxes = includesTaxes

  const validOnHolidays = getTrimmedParamValue(input, 'validOnHolidays')
  if (validOnHolidays) initialFormData.validOnHolidays = validOnHolidays

  const hasExclusivity = getTrimmedParamValue(input, 'hasExclusivity')
  if (hasExclusivity) initialFormData.hasExclusivity = hasExclusivity

  const blackoutDates = getTrimmedParamValue(input, 'blackoutDates')
  if (blackoutDates) initialFormData.blackoutDates = blackoutDates

  const exclusivityCondition = getTrimmedParamValue(input, 'exclusivityCondition')
  if (exclusivityCondition) initialFormData.exclusivityCondition = exclusivityCondition

  const hasOtherBranches = getTrimmedParamValue(input, 'hasOtherBranches')
  if (hasOtherBranches) initialFormData.hasOtherBranches = hasOtherBranches

  const redemptionMethods = parseStringArray(getTrimmedParamValue(input, 'redemptionMethods'))
  if (redemptionMethods.length > 0) {
    initialFormData.redemptionMethods = redemptionMethods
  }

  if (contactDetails) initialFormData.contactDetails = contactDetails
  if (socialMedia) initialFormData.socialMedia = socialMedia
  if (businessReview) initialFormData.businessReview = businessReview

  const textFieldKeys: Array<keyof BookingFormData> = [
    'nameEs',
    'shortTitle',
    'emailTitle',
    'whatWeLike',
    'aboutCompany',
    'aboutOffer',
    'goodToKnow',
    'howToUseEs',
    'offerMargin',
    'cancellationPolicy',
    'marketValidation',
    'additionalComments',
  ]

  textFieldKeys.forEach((fieldKey) => {
    const value = getTrimmedParamValue(input, fieldKey)
    if (value) {
      ;(initialFormData as Record<string, unknown>)[fieldKey] = value
    }
  })

  const pricingOptions = parseJsonValue<BookingFormData['pricingOptions']>(getTrimmedParamValue(input, 'pricingOptions'))
  if (Array.isArray(pricingOptions) && pricingOptions.length > 0) {
    initialFormData.pricingOptions = pricingOptions
  }

  const dealImages = parseJsonValue<BookingFormData['dealImages']>(getTrimmedParamValue(input, 'dealImages'))
  if (Array.isArray(dealImages) && dealImages.length > 0) {
    initialFormData.dealImages = dealImages
  }

  const additionalInfo = parseJsonValue<{
    fields?: Record<string, string>
    bookingAttachments?: unknown
  }>(getTrimmedParamValue(input, 'additionalInfo'))

  if (additionalInfo) {
    const bookingAttachments = parseBookingAttachments(additionalInfo.bookingAttachments)
    if (bookingAttachments.length > 0) {
      initialFormData.bookingAttachments = bookingAttachments
    }

    if (additionalInfo.fields && typeof additionalInfo.fields === 'object') {
      Object.entries(additionalInfo.fields).forEach(([fieldKey, value]) => {
        if (typeof value === 'string' && value.trim().length > 0) {
          ;(initialFormData as Record<string, unknown>)[fieldKey] = value
        }
      })
    }
  }

  return initialFormData
}
