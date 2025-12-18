// Complete form data structure with 9 sections (Configuración and Operatividad merged)
export type BookingFormData = {
  // Configuración: Configuración General y Vigencia (merged Configuración and Operatividad)
  advisorEmail: string
  businessName: string
  partnerEmail: string
  additionalEmails: string[] // Additional emails to send the request to
  assignedAdvisor: string
  salesType: string
  agencyContact: string
  tentativeLaunchDate: string
  campaignDuration: string
  internalPeriod: string
  
  // Operatividad: Operatividad y Pagos
  redemptionMode: string
  isRecurring: string
  recurringOfferLink: string
  paymentType: string
  paymentInstructions: string
  
  // Directorio: Directorio de Responsables
  redemptionContactName: string
  redemptionContactEmail: string
  redemptionContactPhone: string
  approverBusinessName: string
  approverName: string
  approverEmail: string
  
  // Fiscales: Datos Fiscales, Bancarios y de Ubicación
  legalName: string
  rucDv: string
  bankAccountName: string
  bank: string
  accountNumber: string
  accountType: string
  addressAndHours: string
  province: string
  district: string
  corregimiento: string
  
  // Negocio: Reglas de Negocio y Restricciones
  includesTaxes: string
  validOnHolidays: string
  hasExclusivity: string
  blackoutDates: string
  exclusivityCondition: string
  giftVouchers: string
  hasOtherBranches: string
  vouchersPerPerson: string
  commission: string
  
  // Descripción: Descripción y Canales de Venta
  redemptionMethods: string[]
  contactDetails: string
  socialMedia: string
  businessReview: string
  offerDetails: string
  
  // AI-Generated Content Fields (for deal page display)
  whatWeLike: string      // Lo que nos gusta
  aboutCompany: string    // La empresa
  aboutOffer: string      // Acerca de esta oferta
  goodToKnow: string      // Lo que conviene saber
  
  // Estructura: Estructura de la Oferta
  pricingOptions: Array<{
    title: string
    description: string
    price: string
    realValue: string
    quantity: string
    imageUrl?: string // S3 URL for the option image
  }>
  
  // Deal Images Gallery (general images for the deal)
  dealImages: Array<{
    url: string
    order: number
  }>
  
  // Políticas: Políticas Generales
  cancellationPolicy: string
  marketValidation: string
  additionalComments: string
  
  // ============================================================
  // LEGACY RESTAURANT FIELDS (kept for backward compatibility)
  // ============================================================
  validForDineIn: string
  validForTakeout: string
  validForDelivery: string
  hasAdditionalCost: string
  deliveryAreas: string
  orderMethod: string
  vouchersPerOrder: string
  voucherPersonRatio: string
  orderTime: string
  kitchenClosingTime: string
  validForFullMenu: string
  applicableBeverages: string
  excessPaymentMethod: string
  offerDishTypes: string
  executiveMenuIncluded: string
  hasTerrace: string
  lunchHours: string
  dinnerHours: string
  chefName: string
  houseSpecialty: string
  requiresReservation: string
  childAgeCount: string
  validForPrivateEvents: string
  privateEventMinPeople: string
  alcoholSubstitution: string
  holidayValidity: string

  // ============================================================
  // TEMPLATE: RESTAURANTE
  // ============================================================
  restaurantValidDineIn: string
  restaurantValidTakeout: string
  restaurantValidDelivery: string
  restaurantDeliveryCost: string
  restaurantDeliveryAreas: string
  restaurantOrderMethod: string
  restaurantVouchersPerOrder: string
  restaurantVoucherPersonRatio: string
  restaurantOrderTime: string
  restaurantKitchenClosingTime: string
  restaurantValidFullMenu: string
  restaurantApplicableBeverages: string
  restaurantExcessPayment: string
  restaurantOfferDishTypes: string
  restaurantExecutiveMenuIncluded: string
  restaurantHasTerrace: string
  restaurantLunchHours: string
  restaurantDinnerHours: string
  restaurantChefName: string
  restaurantHouseSpecialty: string
  restaurantRequiresReservation: string
  restaurantChildAgeCount: string
  restaurantPrivateEvents: string
  restaurantPrivateEventMinPeople: string
  restaurantAlcoholSubstitution: string
  restaurantValidHolidays: string
  
  // ============================================================
  // TEMPLATE: HOTEL (HOTELES)
  // ============================================================
  hotelCheckIn: string
  hotelCheckOut: string
  hotelMaxBookingDate: string
  hotelLateCheckOut: string
  hotelLateCheckOutIncludesRoom: string
  hotelMealTypes: string
  hotelLunchDay: string
  hotelMealsIncluded: string
  hotelMenuDescription: string
  hotelIncludesITBMS: string
  hotelIncludesHotelTax: string
  hotelChildPolicy: string
  hotelMaxPeoplePerRoom: string
  hotelAdditionalPersonPrice: string
  hotelAdditionalPersonIncludes: string
  hotelRoomType: string
  hotelHasWiFi: string
  hotelAcceptsPets: string
  hotelPetWeightLimit: string
  hotelPetCostPerDay: string
  hotelPetLimit: string
  hotelIncludesParking: string
  hotelValetParking: string
  hotelConsecutiveVouchers: string
  hotelAllowsFoodBeverages: string
  hotelValidHolidays: string
  hotelValidSchoolHolidays: string
  
  // ============================================================
  // TEMPLATE: PRODUCTOS
  // ============================================================
  productWarranty: string
  productBrand: string
  productModel: string
  productDimensions: string
  productCharacteristics: string
  productPickupLocation: string
  productValidHolidays: string

  // ============================================================
  // TEMPLATE: EVENTOS (SHOWS Y EVENTOS)
  // ============================================================
  eventStartTime: string
  eventDoorsOpenTime: string
  eventEndTime: string
  eventMainArtistTime: string
  eventTicketPickupStartTime: string
  eventTicketPickupEndTime: string
  eventTicketPickupLocation: string
  eventOpeningArtist: string
  eventOpenBarDetails: string
  eventMinimumAge: string
  eventChildrenPolicy: string

  // ============================================================
  // TEMPLATE: OBRAS (Teatro)
  // ============================================================
  showDuration: string
  showLanguage: string
  showTime: string
  showDoorsOpenTime: string
  showMinimumAge: string
  showChildrenPolicy: string

  // ============================================================
  // TEMPLATE: SEMINARIOS (CURSOS:Seminarios)
  // ============================================================
  courseFormat: string
  courseAllowsChildren: string
  courseChildrenPolicy: string
  courseLanguage: string
  courseDuration: string
  courseIncludesRefreshments: string
  courseIncludesMaterials: string
  courseIncludesCertificate: string
  courseCertificateFormat: string

  // ============================================================
  // TEMPLATE: CURSOS_ACADEMICOS (CURSOS:Idiomas, Otros)
  // ============================================================
  academicHasTest: string
  academicHasCertificate: string
  academicCertificateFormat: string
  academicMinAge: string
  academicLanguages: string
  academicSyllabus: string
  academicSchedule: string
  academicEmailResponseTime: string
  academicOnlineCompletionTime: string
  academicOnlineDevices: string

  // ============================================================
  // TEMPLATE: CURSO_COCINA (CURSOS:Cocina)
  // ============================================================
  cookingDishes: string
  cookingRequiresExperience: string
  cookingDuration: string
  cookingSchedule: string
  cookingAgeRange: string

  // ============================================================
  // TEMPLATE: MASCOTAS
  // ============================================================
  petServiceIncludes: string
  petServiceExcludes: string
  petAppliesTo: string
  petRestrictions: string
  petServiceDuration: string
  petDropOffTime: string
  petRequiresReservation: string
  petReservationAdvance: string
  petCancellationPolicy: string

  // ============================================================
  // TEMPLATE: TOURS (TURISMO & TOURS)
  // ============================================================
  tourDeparture: string
  tourReturn: string
  tourIncludesMeals: string
  tourIncludesBeverages: string
  tourMealTypes: string
  tourIncludesAlcohol: string
  tourMenuDescription: string
  tourRestrictions: string
  tourIncludesGuide: string
  tourAgeLimit: string
  tourChildrenFreeAge: string
  tourChildrenMealsIncluded: string
  tourAcceptsPets: string
  tourPetWeightLimit: string
  tourPetLimit: string
  tourValidSchoolHolidays: string
  tourAllowsFoodBeverages: string

  // ============================================================
  // TEMPLATE: DENTAL (DENTAL & ESTÉTICA DENTAL)
  // ============================================================
  dentalAppliesToBraces: string
  dentalMinAge: string
  dentalWhiteningType: string
  dentalXrayDelivery: string
  dentalContraindications: string
  dentalValidHolidays: string

  // ============================================================
  // TEMPLATE: GIMNASIOS (GIMNASIOS & FITNESS)
  // ============================================================
  gymRegularClientRestriction: string
  gymMembershipIncluded: string
  gymMembershipPrice: string
  gymValidForGender: string
  gymMinAge: string
  gymMinMaxPeoplePerClass: string
  gymPackageStartDeadline: string

  // ============================================================
  // TEMPLATE: LABORATORIO (LABORATORIOS Y SALUD CLÍNICA)
  // ============================================================
  labMinAge: string
  labFastingRequired: string
  labFastingDuration: string
  labAppointmentType: string
  labResultsTime: string
  labResultsDelivery: string
  labSampleDeadline: string
  labValidHolidays: string

  // ============================================================
  // TEMPLATE: DONACION (COMUNIDAD OS)
  // ============================================================
  donationContactEmail: string
  donationReceiptDeadline: string

  // ============================================================
  // TEMPLATE: CATERING (SERVICIOS:Catering)
  // ============================================================
  cateringValidPickup: string
  cateringValidDelivery: string
  cateringDeliveryCost: string
  cateringDeliveryAreas: string
  cateringOrderMethod: string
  cateringVouchersPerOrder: string
  cateringAdvanceTime: string
  cateringIncludesEventService: string
  cateringEventServiceDuration: string

  // ============================================================
  // TEMPLATE: FOTOGRAFIA (SERVICIOS:Fotografía)
  // ============================================================
  photoSessionDuration: string
  photoSessionLocation: string
  photoExteriorAreas: string
  photoSessionTypes: string
  photoAdditionalPeople: string
  photoCombineVouchers: string
  photoPetsAllowed: string
  photoPetsCost: string
  photoOutfitChanges: string
  photoIncludesMakeup: string
  photoDeliveryType: string
  photoValidWeekends: string

  // ============================================================
  // TEMPLATE: OPTICAS (SERVICIOS:Ópticas)
  // ============================================================
  opticsIncludesExam: string
  opticsIncludesPrescription: string
  opticsAppliesToContacts: string
  opticsAppliesToSunglasses: string
  opticsFrameOnly: string
  opticsAllBrands: string
  opticsRestrictions: string

  // ============================================================
  // TEMPLATE: ALQUILER_VESTIDOS (SERVICIOS:Alquiler de vestidos)
  // ============================================================
  dressAvailableSizes: string
  dressIncludesTailoring: string
  dressRequiresDeposit: string
  dressDepositAmount: string
  dressPickupReturnPolicy: string

  // ============================================================
  // TEMPLATE: RECREACION (ACTIVIDADES: Al Aire Libre, Recreación, Yates)
  // ============================================================
  experienceDuration: string
  experienceIncludes: string
  experienceExcludes: string
  experienceMinAge: string
  experienceRestrictions: string
  experienceRequiresReservation: string
  experienceReservationAdvance: string
  experienceCancellationPolicy: string

  // ============================================================
  // TEMPLATE: INFANTIL (ACTIVIDADES: Infantiles)
  // ============================================================
  childExperienceDuration: string
  childExperienceIncludes: string
  childExperienceExcludes: string
  childMinAge: string
  childAdultMustPay: string
  childAdultPrice: string
  childRestrictions: string
  childRequiresReservation: string
  childReservationAdvance: string
  childCancellationPolicy: string

  // ============================================================
  // TEMPLATE: CEJAS_PESTANAS (BIENESTAR Y BELLEZA)
  // ============================================================
  eyebrowValidForGender: string
  eyebrowMinAge: string
  eyebrowResultsDuration: string
  eyebrowContraindications: string
  eyebrowIncludesRetouch: string
  eyebrowRetouchDetails: string
  eyebrowUsesAnesthesia: string
  eyebrowAftercare: string
  eyebrowLashType: string
  eyebrowPreviousTattoo: string
  eyebrowValidHolidays: string

  // ============================================================
  // TEMPLATE: MASAJES (BIENESTAR Y BELLEZA)
  // ============================================================
  massageValidForGender: string
  massageMinAge: string
  massagePregnantAllowed: string
  massageCouplesValid: string
  massageCouplesExtraCost: string
  massageBodyAreas: string
  massageDuration: string
  massageValidHolidays: string

  // ============================================================
  // TEMPLATE: CABELLO (BIENESTAR Y BELLEZA)
  // ============================================================
  hairProductBrand: string
  hairFantasyColors: string
  hairRootRetouch: string
  hairPregnantAllowed: string
  hairBlackBase: string
  hairCalifornianaBalayage: string
  hairResultsDuration: string
  hairIsStraightening: string
  hairValidForGender: string
  hairMinAge: string
  hairValidAllTypes: string
  hairLengthApplies: string
  hairIncludesCut: string
  hairContainsFormaldehyde: string
  hairEffect: string
  hairLeaveInTime: string
  hairAftercare: string
  hairContraindications: string
  hairValidHolidays: string

  // ============================================================
  // TEMPLATE: MANICURE (BIENESTAR Y BELLEZA)
  // ============================================================
  nailsDiabeticFoot: string
  nailsPolishIncluded: string
  nailsPolishBrands: string
  nailsServiceType: string
  nailsValidForGender: string
  nailsMinAge: string
  nailsSemiPermRemoval: string
  nailsSemiPermRemovalCost: string
  nailsSemiPermDuration: string
  nailsAppointmentDuration: string
  nailsValidHolidays: string

  // ============================================================
  // TEMPLATE: FACIALES (BIENESTAR Y BELLEZA)
  // ============================================================
  facialDescription: string
  facialSpecificTreatments: string
  facialIncludesExtraction: string
  facialValidForGender: string
  facialMinAge: string
  facialProductBrands: string
  facialContraindications: string
  facialValidHolidays: string

  // ============================================================
  // TEMPLATE: DEPILACION (BIENESTAR Y BELLEZA)
  // ============================================================
  depilationValidForGender: string
  depilationMinAge: string
  depilationSessionsNeeded: string
  depilationTreatmentType: string
  depilationAppointmentDuration: string
  depilationBikiniType: string
  depilationIncludesPerianal: string
  depilationContraindications: string
  depilationWaxBrand: string
  depilationValidHolidays: string

  // ============================================================
  // TEMPLATE: REDUCTORES (BIENESTAR Y BELLEZA)
  // ============================================================
  reducerValidForGender: string
  reducerMinAge: string
  reducerAreasPerPackage: string
  reducerTreatmentsPerVisit: string
  reducerAppointmentDuration: string
  reducerVisitFrequency: string
  reducerContraindications: string
  reducerPackageStartDeadline: string
  reducerValidHolidays: string

  // ============================================================
  // TEMPLATE: TRATAMIENTO_PIEL (BIENESTAR Y BELLEZA / MÉDICO ESTÉTICO)
  // ============================================================
  skinValidForGender: string
  skinMinAge: string
  skinExpectedResults: string
  skinSessionsNeeded: string
  skinAftercare: string
  skinContraindications: string
  skinPackageStartDeadline: string
  skinValidHolidays: string

  // ============================================================
  // TEMPLATE: SERVICIO_AUTOS (SERVICIOS:Automóviles)
  // ============================================================
  autoAppliesToVans: string
  autoTintBrand: string
  autoHasWaitingRoom: string
  autoCleaningIncludes: string
  autoInteriorSeatsRemoved: string
  autoProductBrands: string
  autoPolishingMethod: string
  autoExcludedModels: string
  autoAlarmDetails: string
  autoServiceDuration: string
  autoValidHolidays: string

  // ============================================================
  // TEMPLATE: ALQUILER_AUTOS (SERVICIOS:Automóviles)
  // ============================================================
  rentalDeposit: string
  rentalCoveragePlans: string
  rentalMinAge: string
  rentalTransmission: string
  rentalModelsYears: string
  rentalMultipleLocations: string
  rentalMultiLocationFee: string
  rentalValidHolidays: string

  // ============================================================
  // TEMPLATE: AC_AUTOS (SERVICIOS:Automóviles)
  // ============================================================
  acAutoHasWaitingRoom: string
  acAutoVehicleTypes: string
  acAutoServiceDescription: string
  acAutoServiceDuration: string
  acAutoNonDismantled: string
  acAutoFilterInfo: string
  acAutoIncludesMaterials: string
  acAutoValidHolidays: string

  // ============================================================
  // TEMPLATE: AC_CASAS (SERVICIOS:Hogar)
  // ============================================================
  acHomeMaintenanceIncludes: string
  acHomeIncludesMaterials: string
  acHomeMaintenanceType: string
  acHomeCoverageAreas: string
  acHomeValidHolidays: string

  // ============================================================
  // TEMPLATE: ENTRENAMIENTO (e.g., baile/entrenamiento)
  // ============================================================
  trainingSchedule: string
  trainingCanCombine: string
  trainingRegularClientRestriction: string
  trainingMembershipIncluded: string
  trainingValidForGender: string
  trainingMinAge: string
  trainingMinMaxPeople: string
  trainingPackageStartDeadline: string
  trainingValidHolidays: string

  // Dates and Category (used for booking)
  startDate: string
  endDate: string
  category: string
  parentCategory: string
  subCategory1: string
  subCategory2: string
  subCategory3: string
  
  // Opportunity link
  opportunityId: string
}

export type PricingOption = {
  title: string
  description: string
  price: string
  realValue: string
  quantity: string
  imageUrl?: string // S3 URL for the option image
}
