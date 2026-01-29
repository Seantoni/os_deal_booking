import type { SvgIconComponent } from '@mui/icons-material'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import SettingsIcon from '@mui/icons-material/Settings'
import PeopleIcon from '@mui/icons-material/People'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import GavelIcon from '@mui/icons-material/Gavel'
import StoreIcon from '@mui/icons-material/Store'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import VerifiedIcon from '@mui/icons-material/Verified'
import InfoIcon from '@mui/icons-material/Info'
import type { BookingFormData } from './types'

export type StepConfig = {
  id: number
  key: string // Step identifier based on title
  title: string
  icon: SvgIconComponent
}

export const STEPS: StepConfig[] = [
  { id: 1, key: 'configuracion', title: 'Configuración', icon: DescriptionIcon },
  { id: 2, key: 'operatividad', title: 'Operatividad', icon: SettingsIcon },
  { id: 3, key: 'directorio', title: 'Directorio', icon: PeopleIcon },
  { id: 4, key: 'fiscales', title: 'Fiscales', icon: AccountBalanceIcon },
  { id: 5, key: 'negocio', title: 'Negocio', icon: GavelIcon },
  { id: 6, key: 'estructura', title: 'Estructura', icon: AttachMoneyIcon },
  { id: 7, key: 'informacion-adicional', title: 'Información Adicional', icon: InfoIcon },
  { id: 8, key: 'contenido', title: 'Contenido', icon: StoreIcon },
  { id: 9, key: 'validacion', title: 'Validación', icon: VerifiedIcon },
]

// Helper functions to work with step keys
export const getStepByKey = (key: string): StepConfig | undefined => {
  return STEPS.find(step => step.key === key)
}

export const getStepKeyById = (id: number): string | undefined => {
  return STEPS.find(step => step.id === id)?.key
}

export const getStepIdByKey = (key: string): number | undefined => {
  return STEPS.find(step => step.key === key)?.id
}

export const getStepIndexByKey = (key: string): number => {
  return STEPS.findIndex(step => step.key === key)
}

export const getStepKeyByIndex = (index: number): string | undefined => {
  return STEPS[index]?.key
}

export const INITIAL_FORM_DATA: BookingFormData = {
  // Configuración: Configuración General y Vigencia (merged)
  advisorEmail: '',
  businessName: '',
  partnerEmail: '',
  additionalEmails: [],
  assignedAdvisor: '',
  salesType: 'Regular Sales',
  agencyContact: '',
  tentativeLaunchDate: '',
  campaignDuration: '3',
  campaignDurationUnit: 'months',
  internalPeriod: '',
  
  // Operatividad: Operatividad y Pagos
  redemptionMode: 'Canje Simple',
  isRecurring: 'No',
  recurringOfferLink: '',
  paymentType: '',
  paymentInstructions: '',
  
  // Directorio: Directorio de Responsables
  redemptionContactName: '',
  redemptionContactEmail: '',
  redemptionContactPhone: '',
  approverBusinessName: '',
  approverName: '',
  approverEmail: '',
  
  // Fiscales: Datos Fiscales y Ubicación
  legalName: '',
  rucDv: '',
  bankAccountName: '',
  bank: '',
  accountNumber: '',
  accountType: 'Ahorros',
  addressAndHours: '',
  province: '',
  district: '',
  corregimiento: '',
  
  // Negocio: Reglas de Negocio
  includesTaxes: 'Sí',
  validOnHolidays: 'Sí',
  hasExclusivity: 'No',
  blackoutDates: '',
  exclusivityCondition: '',
  hasOtherBranches: 'No',
  
  // Descripción: Descripción y Canales
  redemptionMethods: [],
  contactDetails: '',
  socialMedia: '',
  businessReview: '',
  
  // AI-Generated Content Fields
  shortTitle: '',
  whatWeLike: '',
  aboutCompany: '',
  aboutOffer: '',
  goodToKnow: '',
  
  // Estructura: Estructura de Oferta
  offerMargin: '',
  pricingOptions: [{
    title: '',
    description: '',
    price: '',
    realValue: '',
    quantity: 'Ilimitado',
    limitByUser: '',
    maxGiftsPerUser: '',
    endAt: '',
    expiresIn: ''
  }],
  
  // Deal Images Gallery
  dealImages: [],
  
  // Políticas: Políticas y Revisión
  cancellationPolicy: '',
  marketValidation: 'Sí',
  additionalComments: '',
  
  // LEGACY RESTAURANT FIELDS
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

  // RESTAURANTE TEMPLATE
  restaurantValidDineIn: '',
  restaurantValidTakeout: '',
  restaurantValidDelivery: '',
  restaurantDeliveryCost: '',
  restaurantDeliveryAreas: '',
  restaurantOrderMethod: '',
  restaurantVouchersPerOrder: '',
  restaurantVoucherPersonRatio: '',
  restaurantOrderTime: '',
  restaurantKitchenClosingTime: '',
  restaurantValidFullMenu: '',
  restaurantApplicableBeverages: '',
  restaurantExcessPayment: '',
  restaurantOfferDishTypes: '',
  restaurantExecutiveMenuIncluded: '',
  restaurantHasTerrace: '',
  restaurantLunchHours: '',
  restaurantDinnerHours: '',
  restaurantChefName: '',
  restaurantHouseSpecialty: '',
  restaurantRequiresReservation: '',
  restaurantChildAgeCount: '',
  restaurantPrivateEvents: '',
  restaurantPrivateEventMinPeople: '',
  restaurantAlcoholSubstitution: '',
  
  // HOTEL TEMPLATE
  hotelCheckIn: '',
  hotelCheckOut: '',
  hotelMaxBookingDate: '',
  hotelLateCheckOut: '',
  hotelLateCheckOutIncludesRoom: '',
  hotelMealTypes: '',
  hotelLunchDay: '',
  hotelMealsIncluded: '',
  hotelMenuDescription: '',
  hotelIncludesITBMS: '',
  hotelIncludesHotelTax: '',
  hotelChildPolicy: '',
  hotelMaxPeoplePerRoom: '',
  hotelAdditionalPersonPrice: '',
  hotelAdditionalPersonIncludes: '',
  hotelRoomType: '',
  hotelHasWiFi: '',
  hotelAcceptsPets: '',
  hotelPetWeightLimit: '',
  hotelPetCostPerDay: '',
  hotelPetLimit: '',
  hotelIncludesParking: '',
  hotelValetParking: '',
  hotelConsecutiveVouchers: '',
  hotelAllowsFoodBeverages: '',
  hotelValidHolidays: '',
  hotelValidSchoolHolidays: '',
  
  // PRODUCTOS TEMPLATE
  productWarranty: '',
  productBrand: '',
  productModel: '',
  productDimensions: '',
  productCharacteristics: '',
  productPickupLocation: '',
  productValidHolidays: '',

  // EVENTOS TEMPLATE
  eventStartTime: '',
  eventDoorsOpenTime: '',
  eventEndTime: '',
  eventMainArtistTime: '',
  eventTicketPickupStartTime: '',
  eventTicketPickupEndTime: '',
  eventTicketPickupLocation: '',
  eventOpeningArtist: '',
  eventOpenBarDetails: '',
  eventMinimumAge: '',
  eventChildrenPolicy: '',

  // OBRAS TEMPLATE
  showDuration: '',
  showLanguage: '',
  showTime: '',
  showDoorsOpenTime: '',
  showMinimumAge: '',
  showChildrenPolicy: '',

  // SEMINARIOS TEMPLATE
  courseFormat: '',
  courseAllowsChildren: '',
  courseChildrenPolicy: '',
  courseLanguage: '',
  courseDuration: '',
  courseIncludesRefreshments: '',
  courseIncludesMaterials: '',
  courseIncludesCertificate: '',
  courseCertificateFormat: '',

  // CURSOS_ACADEMICOS TEMPLATE
  academicHasTest: '',
  academicHasCertificate: '',
  academicCertificateFormat: '',
  academicMinAge: '',
  academicLanguages: '',
  academicSyllabus: '',
  academicSchedule: '',
  academicEmailResponseTime: '',
  academicOnlineCompletionTime: '',
  academicOnlineDevices: '',

  // CURSO_COCINA TEMPLATE
  cookingDishes: '',
  cookingRequiresExperience: '',
  cookingDuration: '',
  cookingSchedule: '',
  cookingAgeRange: '',

  // MASCOTAS TEMPLATE
  petServiceIncludes: '',
  petServiceExcludes: '',
  petAppliesTo: '',
  petRestrictions: '',
  petServiceDuration: '',
  petDropOffTime: '',
  petRequiresReservation: '',
  petReservationAdvance: '',
  petCancellationPolicy: '',

  // TOURS TEMPLATE
  tourDeparture: '',
  tourReturn: '',
  tourIncludesMeals: '',
  tourIncludesBeverages: '',
  tourMealTypes: '',
  tourIncludesAlcohol: '',
  tourMenuDescription: '',
  tourRestrictions: '',
  tourIncludesGuide: '',
  tourAgeLimit: '',
  tourChildrenFreeAge: '',
  tourChildrenMealsIncluded: '',
  tourAcceptsPets: '',
  tourPetWeightLimit: '',
  tourPetLimit: '',
  tourValidSchoolHolidays: '',
  tourAllowsFoodBeverages: '',

  // DENTAL TEMPLATE
  dentalAppliesToBraces: '',
  dentalMinAge: '',
  dentalWhiteningType: '',
  dentalXrayDelivery: '',
  dentalContraindications: '',
  dentalValidHolidays: '',

  // GIMNASIOS TEMPLATE
  gymRegularClientRestriction: '',
  gymMembershipIncluded: '',
  gymMembershipPrice: '',
  gymValidForGender: '',
  gymMinAge: '',
  gymMinMaxPeoplePerClass: '',
  gymPackageStartDeadline: '',

  // LABORATORIO TEMPLATE
  labMinAge: '',
  labFastingRequired: '',
  labFastingDuration: '',
  labAppointmentType: '',
  labResultsTime: '',
  labResultsDelivery: '',
  labSampleDeadline: '',
  labValidHolidays: '',

  // DONACION TEMPLATE
  donationContactEmail: '',
  donationReceiptDeadline: '',

  // CATERING TEMPLATE
  cateringValidPickup: '',
  cateringValidDelivery: '',
  cateringDeliveryCost: '',
  cateringDeliveryAreas: '',
  cateringOrderMethod: '',
  cateringVouchersPerOrder: '',
  cateringAdvanceTime: '',
  cateringIncludesEventService: '',
  cateringEventServiceDuration: '',

  // FOTOGRAFIA TEMPLATE
  photoSessionDuration: '',
  photoSessionLocation: '',
  photoExteriorAreas: '',
  photoSessionTypes: '',
  photoAdditionalPeople: '',
  photoCombineVouchers: '',
  photoPetsAllowed: '',
  photoPetsCost: '',
  photoOutfitChanges: '',
  photoIncludesMakeup: '',
  photoDeliveryType: '',
  photoValidWeekends: '',

  // OPTICAS TEMPLATE
  opticsIncludesExam: '',
  opticsIncludesPrescription: '',
  opticsAppliesToContacts: '',
  opticsAppliesToSunglasses: '',
  opticsFrameOnly: '',
  opticsAllBrands: '',
  opticsRestrictions: '',

  // ALQUILER_VESTIDOS TEMPLATE
  dressAvailableSizes: '',
  dressIncludesTailoring: '',
  dressRequiresDeposit: '',
  dressDepositAmount: '',
  dressPickupReturnPolicy: '',

  // RECREACION TEMPLATE
  experienceDuration: '',
  experienceIncludes: '',
  experienceExcludes: '',
  experienceMinAge: '',
  experienceRestrictions: '',
  experienceRequiresReservation: '',
  experienceReservationAdvance: '',
  experienceCancellationPolicy: '',

  // INFANTIL TEMPLATE
  childExperienceDuration: '',
  childExperienceIncludes: '',
  childExperienceExcludes: '',
  childMinAge: '',
  childAdultMustPay: '',
  childAdultPrice: '',
  childRestrictions: '',
  childRequiresReservation: '',
  childReservationAdvance: '',
  childCancellationPolicy: '',

  // CEJAS_PESTANAS TEMPLATE
  eyebrowValidForGender: '',
  eyebrowMinAge: '',
  eyebrowResultsDuration: '',
  eyebrowContraindications: '',
  eyebrowIncludesRetouch: '',
  eyebrowRetouchDetails: '',
  eyebrowUsesAnesthesia: '',
  eyebrowAftercare: '',
  eyebrowLashType: '',
  eyebrowPreviousTattoo: '',
  eyebrowValidHolidays: '',

  // MASAJES TEMPLATE
  massageValidForGender: '',
  massageMinAge: '',
  massagePregnantAllowed: '',
  massageCouplesValid: '',
  massageCouplesExtraCost: '',
  massageBodyAreas: '',
  massageDuration: '',
  massageValidHolidays: '',

  // CABELLO TEMPLATE
  hairProductBrand: '',
  hairFantasyColors: '',
  hairRootRetouch: '',
  hairPregnantAllowed: '',
  hairBlackBase: '',
  hairCalifornianaBalayage: '',
  hairResultsDuration: '',
  hairIsStraightening: '',
  hairValidForGender: '',
  hairMinAge: '',
  hairValidAllTypes: '',
  hairLengthApplies: '',
  hairIncludesCut: '',
  hairContainsFormaldehyde: '',
  hairEffect: '',
  hairLeaveInTime: '',
  hairAftercare: '',
  hairContraindications: '',
  hairValidHolidays: '',

  // MANICURE TEMPLATE
  nailsDiabeticFoot: '',
  nailsPolishIncluded: '',
  nailsPolishBrands: '',
  nailsServiceType: '',
  nailsValidForGender: '',
  nailsMinAge: '',
  nailsSemiPermRemoval: '',
  nailsSemiPermRemovalCost: '',
  nailsSemiPermDuration: '',
  nailsAppointmentDuration: '',
  nailsValidHolidays: '',

  // FACIALES TEMPLATE
  facialDescription: '',
  facialSpecificTreatments: '',
  facialIncludesExtraction: '',
  facialValidForGender: '',
  facialMinAge: '',
  facialProductBrands: '',
  facialContraindications: '',
  facialValidHolidays: '',

  // DEPILACION TEMPLATE
  depilationValidForGender: '',
  depilationMinAge: '',
  depilationSessionsNeeded: '',
  depilationTreatmentType: '',
  depilationAppointmentDuration: '',
  depilationBikiniType: '',
  depilationIncludesPerianal: '',
  depilationContraindications: '',
  depilationWaxBrand: '',
  depilationValidHolidays: '',

  // REDUCTORES TEMPLATE
  reducerValidForGender: '',
  reducerMinAge: '',
  reducerAreasPerPackage: '',
  reducerTreatmentsPerVisit: '',
  reducerAppointmentDuration: '',
  reducerVisitFrequency: '',
  reducerContraindications: '',
  reducerPackageStartDeadline: '',
  reducerValidHolidays: '',

  // TRATAMIENTO_PIEL TEMPLATE
  skinValidForGender: '',
  skinMinAge: '',
  skinExpectedResults: '',
  skinSessionsNeeded: '',
  skinAftercare: '',
  skinContraindications: '',
  skinPackageStartDeadline: '',
  skinValidHolidays: '',

  // SERVICIO_AUTOS TEMPLATE
  autoAppliesToVans: '',
  autoTintBrand: '',
  autoHasWaitingRoom: '',
  autoCleaningIncludes: '',
  autoInteriorSeatsRemoved: '',
  autoProductBrands: '',
  autoPolishingMethod: '',
  autoExcludedModels: '',
  autoAlarmDetails: '',
  autoServiceDuration: '',
  autoValidHolidays: '',

  // ALQUILER_AUTOS TEMPLATE
  rentalDeposit: '',
  rentalCoveragePlans: '',
  rentalMinAge: '',
  rentalTransmission: '',
  rentalModelsYears: '',
  rentalMultipleLocations: '',
  rentalMultiLocationFee: '',
  rentalValidHolidays: '',

  // AC_AUTOS TEMPLATE
  acAutoHasWaitingRoom: '',
  acAutoVehicleTypes: '',
  acAutoServiceDescription: '',
  acAutoServiceDuration: '',
  acAutoNonDismantled: '',
  acAutoFilterInfo: '',
  acAutoIncludesMaterials: '',
  acAutoValidHolidays: '',

  // AC_CASAS TEMPLATE
  acHomeMaintenanceIncludes: '',
  acHomeIncludesMaterials: '',
  acHomeMaintenanceType: '',
  acHomeCoverageAreas: '',
  acHomeValidHolidays: '',

  // ENTRENAMIENTO TEMPLATE
  trainingSchedule: '',
  trainingCanCombine: '',
  trainingRegularClientRestriction: '',
  trainingMembershipIncluded: '',
  trainingValidForGender: '',
  trainingMinAge: '',
  trainingMinMaxPeople: '',
  trainingPackageStartDeadline: '',
  trainingValidHolidays: '',

  // Dates and Category
  startDate: '',
  endDate: '',
  category: '',
  parentCategory: '',
  subCategory1: '',
  subCategory2: '',
  subCategory3: '',
  
  // Opportunity link
  opportunityId: ''
}
