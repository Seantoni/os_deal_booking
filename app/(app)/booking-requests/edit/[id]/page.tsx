import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getBookingRequest } from '@/app/actions/booking'
import { normalizeAdditionalRedemptionContacts } from '@/lib/booking-requests/additional-redemption-contacts'
import EnhancedBookingForm from '@/components/RequestForm'
import PageContent from '@/components/common/PageContent'
import type { PricingOption } from '@/types/deal'

type StoredPricingOption = PricingOption & {
  limitByUser?: string | number | null
  maxGiftsPerUser?: string | number | null
  endAt?: string | null
  expiresIn?: string | number | null
}

/**
 * Additional info structure for template-based fields
 */
interface AdditionalInfo {
  templateName?: string
  templateDisplayName?: string
  fields?: Record<string, string>
  bookingAttachments?: Array<{
    url: string
    filename: string
    mimeType: string
    size: number
  }>
}

interface EditBookingRequestPageProps {
  params: Promise<{ id: string }>
}

export default async function EditBookingRequestPage({ params }: EditBookingRequestPageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/booking-requests/edit')

  const { id } = await params

  // Fetch the booking request
  const bookingRequestResult = await getBookingRequest(id)

  if (!bookingRequestResult.success || !bookingRequestResult.data) {
    notFound()
  }

  const bookingRequest = bookingRequestResult.data

  // Only allow editing draft requests
  if (bookingRequest.status !== 'draft') {
    redirect('/booking-requests')
  }

  // Format dates for input fields (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // BookingRequest from Prisma has many dynamic JSON fields.
  // We use a typed accessor pattern to safely access known JSON structures.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const br = bookingRequest as Record<string, any>

  // Parse additional emails from database (stored as JSON array)
  const rawEmails = br.additionalEmails
  const additionalEmails: string[] = Array.isArray(rawEmails) ? rawEmails : []
  const additionalBankAccounts = Array.isArray(br.additionalBankAccounts) ? br.additionalBankAccounts : []
  const additionalRedemptionContacts = normalizeAdditionalRedemptionContacts(br.additionalRedemptionContacts)

  // Parse additionalInfo from database (stored as JSON object)
  const storedAdditionalInfo: AdditionalInfo | null = 
    br.additionalInfo && typeof br.additionalInfo === 'object' 
      ? br.additionalInfo 
      : null

  // Build initial form data from booking request
  const initialFormData = {
    advisorEmail: '',
    businessName: bookingRequest.name || bookingRequest.businessEmail.split('@')[0] || '',
    partnerEmail: bookingRequest.businessEmail || '',
    additionalEmails,
    assignedAdvisor: '',
    salesType: '',
    agencyContact: '',
    tentativeLaunchDate: formatDateForInput(bookingRequest.startDate),
    campaignDuration: br.campaignDuration || '',
    campaignDurationUnit: br.campaignDurationUnit || 'months',
    eventDays: Array.isArray(br.eventDays)
      ? br.eventDays
          .filter((date: unknown): date is string => typeof date === 'string')
          .map((date: string) => date.trim())
          .filter((date: string) => date.length > 0)
      : [],
    internalPeriod: '',
    redemptionMode: br.redemptionMode || '',
    isRecurring: br.isRecurring || '',
    recurringOfferLink: br.recurringOfferLink || '',
    paymentType: br.paymentType || '',
    paymentInstructions: br.paymentInstructions || '',
    redemptionContactName: br.redemptionContactName || '',
    redemptionContactEmail: br.redemptionContactEmail || '',
    redemptionContactPhone: br.redemptionContactPhone || '',
    additionalRedemptionContacts,
    approverBusinessName: '',
    approverName: '',
    approverEmail: '',
    legalName: br.legalName || '',
    rucDv: br.rucDv || '',
    bankAccountName: br.bankAccountName || '',
    bank: br.bank || '',
    accountNumber: br.accountNumber || '',
    accountType: br.accountType || '',
    additionalBankAccounts,
    addressAndHours: br.addressAndHours || '',
    provinceDistrictCorregimiento: br.provinceDistrictCorregimiento || '',
    includesTaxes: br.includesTaxes || '',
    validOnHolidays: br.validOnHolidays || '',
    hasExclusivity: br.hasExclusivity || '',
    blackoutDates: br.blackoutDates || '',
    exclusivityCondition: br.exclusivityCondition || '',
    hasOtherBranches: br.hasOtherBranches || '',
    redemptionMethods: br.redemptionMethods || [],
    contactDetails: br.contactDetails || '',
    socialMedia: br.socialMedia || '',
    businessReview: br.businessReview || '',
    pricingOptions: (br.pricingOptions || []).map((opt: StoredPricingOption) => ({
      title: opt?.title ?? '',
      description: opt?.description ?? '',
      price: opt?.price ?? '',
      realValue: opt?.realValue ?? '',
      quantity: opt?.quantity ?? '',
      imageUrl: opt?.imageUrl ?? '',
      limitByUser: opt?.limitByUser ?? '',
      maxGiftsPerUser: opt?.maxGiftsPerUser ?? '',
      endAt: opt?.endAt ?? '',
      expiresIn: opt?.expiresIn ?? '',
    })),
    dealImages: Array.isArray(br.dealImages) ? br.dealImages : [],
    bookingAttachments: Array.isArray(storedAdditionalInfo?.bookingAttachments) ? storedAdditionalInfo.bookingAttachments : [],
    cancellationPolicy: br.cancellationPolicy || '',
    marketValidation: br.marketValidation || '',
    additionalComments: br.additionalComments || '',
    // Category-specific fields would need to be parsed from description
    validForDineIn: '',
    validForTakeout: '',
    validForDelivery: '',
    hasAdditionalCost: '',
    deliveryAreas: '',
    orderMethod: '',
    vouchersPerOrder: '',
    voucherPersonRatio: '',
    orderTime: '',
    kitchenClosingTime: '',
    validForFullMenu: '',
    applicableBeverages: '',
    excessPaymentMethod: '',
    offerDishTypes: '',
    executiveMenuIncluded: '',
    hasTerrace: '',
    lunchHours: '',
    dinnerHours: '',
    chefName: '',
    houseSpecialty: '',
    requiresReservation: '',
    childAgeCount: '',
    validForPrivateEvents: '',
    privateEventMinPeople: '',
    alcoholSubstitution: '',
    holidayValidity: '',
    hotelCheckIn: br.hotelCheckIn || '',
    hotelCheckOut: br.hotelCheckOut || '',
    hotelMaxBookingDate: br.hotelMaxBookingDate || '',
    hotelLateCheckOut: br.hotelLateCheckOut || '',
    hotelLateCheckOutIncludesRoom: br.hotelLateCheckOutIncludesRoom || '',
    hotelMealTypes: br.hotelMealTypes || '',
    hotelLunchDay: br.hotelLunchDay || '',
    hotelMealsIncluded: br.hotelMealsIncluded || '',
    hotelMenuDescription: br.hotelMenuDescription || '',
    hotelIncludesITBMS: br.hotelIncludesITBMS || '',
    hotelIncludesHotelTax: br.hotelIncludesHotelTax || '',
    hotelChildPolicy: br.hotelChildPolicy || '',
    hotelMaxPeoplePerRoom: br.hotelMaxPeoplePerRoom || '',
    hotelAdditionalPersonPrice: br.hotelAdditionalPersonPrice || '',
    hotelAdditionalPersonIncludes: br.hotelAdditionalPersonIncludes || '',
    hotelRoomType: br.hotelRoomType || '',
    hotelHasWiFi: br.hotelHasWiFi || '',
    hotelAcceptsPets: br.hotelAcceptsPets || '',
    hotelPetWeightLimit: br.hotelPetWeightLimit || '',
    hotelPetCostPerDay: br.hotelPetCostPerDay || '',
    hotelPetLimit: br.hotelPetLimit || '',
    hotelIncludesParking: br.hotelIncludesParking || '',
    hotelValetParking: br.hotelValetParking || '',
    hotelConsecutiveVouchers: br.hotelConsecutiveVouchers || '',
    hotelAllowsFoodBeverages: br.hotelAllowsFoodBeverages || '',
    hotelValidHolidays: br.hotelValidHolidays || '',
    hotelValidSchoolHolidays: br.hotelValidSchoolHolidays || '',
    productWarranty: br.productWarranty || '',
    productBrand: br.productBrand || '',
    productModel: br.productModel || '',
    productDimensions: br.productDimensions || '',
    productCharacteristics: br.productCharacteristics || '',
    productPickupLocation: br.productPickupLocation || '',
    productValidHolidays: br.productValidHolidays || '',
    startDate: formatDateForInput(bookingRequest.startDate),
    endDate: formatDateForInput(bookingRequest.endDate),
    category: bookingRequest.category || '',
    parentCategory: bookingRequest.parentCategory || '',
    subCategory1: bookingRequest.subCategory1 || '',
    subCategory2: bookingRequest.subCategory2 || '',
    subCategory3: bookingRequest.subCategory3 || '',
    opportunityId: bookingRequest.opportunityId || '',
    // Spread dynamic additionalInfo fields
    ...(storedAdditionalInfo?.fields || {}),
  }

  // Don't wrap in extra div - the form has its own full-page layout
  // Use PageContent for sidebar margin handling
  return (
    <PageContent>
      <EnhancedBookingForm 
        requestId={id}
        initialFormData={initialFormData}
      />
    </PageContent>
  )
}
