import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getBookingRequest } from '@/app/actions/booking'
import EnhancedBookingForm from '@/components/RequestForm'

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

  // Parse additional emails from database (stored as JSON)
  // Type assertion: Prisma types may need IDE restart to fully update
  const storedEmails = (bookingRequest as any).additionalEmails
  const additionalEmails = storedEmails && Array.isArray(storedEmails)
    ? (storedEmails as string[])
    : []

  // Parse additionalInfo from database (stored as JSON)
  const storedAdditionalInfo = (bookingRequest as any).additionalInfo as {
    templateName?: string
    templateDisplayName?: string
    fields?: Record<string, string>
  } | null

  // Prisma types may not include all dynamic columns; use a relaxed alias
  const br = bookingRequest as any

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
    internalPeriod: '',
    redemptionMode: br.redemptionMode || '',
    isRecurring: br.isRecurring || '',
    recurringOfferLink: br.recurringOfferLink || '',
    paymentType: br.paymentType || '',
    paymentInstructions: br.paymentInstructions || '',
    redemptionContactName: br.redemptionContactName || '',
    redemptionContactEmail: br.redemptionContactEmail || '',
    redemptionContactPhone: br.redemptionContactPhone || '',
    approverBusinessName: '',
    approverName: '',
    approverEmail: '',
    legalName: br.legalName || '',
    rucDv: br.rucDv || '',
    bankAccountName: br.bankAccountName || '',
    bank: br.bank || '',
    accountNumber: br.accountNumber || '',
    accountType: br.accountType || '',
    addressAndHours: br.addressAndHours || '',
    province: br.province || '',
    district: br.district || '',
    corregimiento: br.corregimiento || '',
    includesTaxes: br.includesTaxes || '',
    validOnHolidays: br.validOnHolidays || '',
    hasExclusivity: br.hasExclusivity || '',
    blackoutDates: br.blackoutDates || '',
    exclusivityCondition: br.exclusivityCondition || '',
    giftVouchers: br.giftVouchers || '',
    hasOtherBranches: br.hasOtherBranches || '',
    vouchersPerPerson: br.vouchersPerPerson || '',
    commission: br.commission || '',
    redemptionMethods: br.redemptionMethods || [],
    contactDetails: br.contactDetails || '',
    socialMedia: br.socialMedia || '',
    businessReview: br.businessReview || '',
    offerDetails: br.offerDetails || '',
    pricingOptions: (br.pricingOptions || []).map((opt: any) => ({
      title: opt?.title ?? '',
      description: opt?.description ?? '',
      price: opt?.price ?? '',
      realValue: opt?.realValue ?? '',
      quantity: opt?.quantity ?? 'Ilimitado',
      imageUrl: opt?.imageUrl ?? '',
    })),
    dealImages: Array.isArray(br.dealImages) ? br.dealImages : [],
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <EnhancedBookingForm 
        requestId={id}
        initialFormData={initialFormData}
      />
    </div>
  )
}

