type BusinessPrefillCategory = {
  id?: string | null
  parentCategory?: string | null
  subCategory1?: string | null
  subCategory2?: string | null
}

export type BookingRequestBusinessPrefillSource = {
  id?: string | null
  name: string
  contactEmail?: string | null
  contactName?: string | null
  contactPhone?: string | null
  category?: BusinessPrefillCategory | null
  razonSocial?: string | null
  ruc?: string | null
  provinceDistrictCorregimiento?: string | null
  bank?: string | null
  beneficiaryName?: string | null
  accountNumber?: string | null
  accountType?: string | null
  paymentPlan?: string | null
  address?: string | null
  neighborhood?: string | null
  description?: string | null
  website?: string | null
  instagram?: string | null
  emailPaymentContacts?: string | null
}

interface BuildBookingRequestBusinessPrefillOptions {
  fromOpportunity?: string
  includeBusinessId?: boolean
}

function normalizeEmailList(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  values.forEach((value) => {
    const email = value?.trim().toLowerCase() || ''
    if (!email || seen.has(email)) return

    seen.add(email)
    normalized.push(email)
  })

  return normalized
}

export function splitBusinessContactEmails(value?: string | null): string[] {
  return normalizeEmailList(value ? value.split(/[;,\s]+/) : [])
}

export function getBusinessPrimaryContactEmail(
  business: Pick<BookingRequestBusinessPrefillSource, 'contactEmail' | 'emailPaymentContacts'>
): string {
  return normalizeEmailList([
    business.contactEmail,
    ...splitBusinessContactEmails(business.emailPaymentContacts),
  ])[0] || ''
}

export function getBusinessAdditionalContactEmails(
  business: Pick<BookingRequestBusinessPrefillSource, 'contactEmail' | 'emailPaymentContacts'>
): string[] {
  const primaryEmail = getBusinessPrimaryContactEmail(business)

  return normalizeEmailList([
    ...splitBusinessContactEmails(business.emailPaymentContacts),
  ]).filter((email) => email !== primaryEmail)
}

export function buildBookingRequestBusinessPrefillParams(
  business: BookingRequestBusinessPrefillSource,
  options: BuildBookingRequestBusinessPrefillOptions = {}
): Record<string, string> {
  const {
    fromOpportunity = 'business',
    includeBusinessId = true,
  } = options

  const primaryEmail = getBusinessPrimaryContactEmail(business)
  const params: Record<string, string> = {
    businessName: business.name,
    businessEmail: primaryEmail,
    contactName: business.contactName || '',
    contactPhone: business.contactPhone || '',
  }

  if (fromOpportunity) {
    params.fromOpportunity = fromOpportunity
  }

  if (includeBusinessId && business.id) {
    params.businessId = business.id
  }

  if (business.category?.id) params.categoryId = business.category.id
  if (business.category?.parentCategory) params.parentCategory = business.category.parentCategory
  if (business.category?.subCategory1) params.subCategory1 = business.category.subCategory1
  if (business.category?.subCategory2) params.subCategory2 = business.category.subCategory2

  if (business.razonSocial) params.legalName = business.razonSocial
  if (business.ruc) params.ruc = business.ruc
  if (business.provinceDistrictCorregimiento) {
    params.provinceDistrictCorregimiento = business.provinceDistrictCorregimiento
  }

  if (business.bank) params.bank = business.bank
  if (business.beneficiaryName) params.bankAccountName = business.beneficiaryName
  if (business.accountNumber) params.accountNumber = business.accountNumber
  if (business.accountType) params.accountType = business.accountType
  if (business.paymentPlan) params.paymentPlan = business.paymentPlan

  if (business.address) params.address = business.address
  if (business.neighborhood) params.neighborhood = business.neighborhood
  if (business.description) params.description = business.description
  if (business.website) params.website = business.website
  if (business.instagram) params.instagram = business.instagram

  const additionalEmails = getBusinessAdditionalContactEmails(business)
  if (additionalEmails.length > 0) {
    params.additionalEmails = JSON.stringify(additionalEmails)
  }

  return params
}
