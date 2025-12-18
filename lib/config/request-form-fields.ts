/**
 * Request Form Fields Configuration
 * 
 * Defines all fields in the booking request form, organized by steps.
 * This is used for the settings UI to configure required/optional fields.
 */

export type RequestFormFieldDefinition = {
  key: string
  label: string
  type: 'text' | 'email' | 'date' | 'select' | 'textarea' | 'number' | 'checkbox' | 'array'
  /** If true, this field only appears for certain categories */
  categorySpecific?: boolean
  /** Category template this field belongs to */
  template?: string
}

export type RequestFormStep = {
  id: number
  key: string
  title: string
  description: string
  fields: RequestFormFieldDefinition[]
}

/**
 * All request form steps with their fields
 */
export const REQUEST_FORM_STEPS: RequestFormStep[] = [
  {
    id: 1,
    key: 'configuracion',
    title: 'Configuración',
    description: 'Configuración general y vigencia',
    fields: [
      { key: 'businessName', label: 'Nombre del Negocio', type: 'text' },
      { key: 'partnerEmail', label: 'Correo del Aliado', type: 'email' },
      { key: 'additionalEmails', label: 'Correos Adicionales', type: 'array' },
      { key: 'category', label: 'Categoría', type: 'select' },
      { key: 'campaignDuration', label: 'Duración de Campaña', type: 'text' },
      { key: 'startDate', label: 'Fecha de Inicio', type: 'date' },
      { key: 'endDate', label: 'Fecha Final', type: 'date' },
    ],
  },
  {
    id: 2,
    key: 'operatividad',
    title: 'Operatividad',
    description: 'Operatividad y pagos',
    fields: [
      { key: 'redemptionMode', label: 'Modo de Canje', type: 'select' },
      { key: 'isRecurring', label: '¿Es Recurrente?', type: 'select' },
      { key: 'recurringOfferLink', label: 'Link de Oferta Recurrente', type: 'text' },
      { key: 'paymentType', label: 'Tipo de Pago', type: 'select' },
      { key: 'paymentInstructions', label: 'Instrucciones de Pago', type: 'textarea' },
    ],
  },
  {
    id: 3,
    key: 'directorio',
    title: 'Directorio',
    description: 'Directorio de responsables',
    fields: [
      { key: 'redemptionContactName', label: 'Nombre Contacto Canje', type: 'text' },
      { key: 'redemptionContactEmail', label: 'Email Contacto Canje', type: 'email' },
      { key: 'redemptionContactPhone', label: 'Teléfono Contacto Canje', type: 'text' },
      { key: 'approverBusinessName', label: 'Nombre Empresa Aprobador', type: 'text' },
      { key: 'approverName', label: 'Nombre Aprobador', type: 'text' },
      { key: 'approverEmail', label: 'Email Aprobador', type: 'email' },
    ],
  },
  {
    id: 4,
    key: 'fiscales',
    title: 'Fiscales',
    description: 'Datos fiscales y ubicación',
    fields: [
      { key: 'legalName', label: 'Razón Social', type: 'text' },
      { key: 'rucDv', label: 'RUC/DV', type: 'text' },
      { key: 'bankAccountName', label: 'Nombre Cuenta Bancaria', type: 'text' },
      { key: 'bank', label: 'Banco', type: 'text' },
      { key: 'accountNumber', label: 'Número de Cuenta', type: 'text' },
      { key: 'accountType', label: 'Tipo de Cuenta', type: 'select' },
      { key: 'addressAndHours', label: 'Dirección y Horarios', type: 'textarea' },
      { key: 'province', label: 'Provincia', type: 'text' },
      { key: 'district', label: 'Distrito', type: 'text' },
      { key: 'corregimiento', label: 'Corregimiento', type: 'text' },
    ],
  },
  {
    id: 5,
    key: 'negocio',
    title: 'Negocio',
    description: 'Reglas de negocio y restricciones',
    fields: [
      { key: 'includesTaxes', label: 'Incluye Impuestos', type: 'select' },
      { key: 'validOnHolidays', label: 'Válido en Feriados', type: 'select' },
      { key: 'hasExclusivity', label: 'Tiene Exclusividad', type: 'select' },
      { key: 'blackoutDates', label: 'Fechas Blackout', type: 'text' },
      { key: 'exclusivityCondition', label: 'Condición de Exclusividad', type: 'textarea' },
      { key: 'giftVouchers', label: 'Vouchers para Regalar', type: 'select' },
      { key: 'hasOtherBranches', label: 'Tiene Otras Sucursales', type: 'select' },
      { key: 'vouchersPerPerson', label: 'Vouchers por Persona', type: 'number' },
      { key: 'commission', label: 'Comisión', type: 'text' },
    ],
  },
  {
    id: 6,
    key: 'descripcion',
    title: 'Descripción',
    description: 'Descripción y canales de venta',
    fields: [
      { key: 'redemptionMethods', label: 'Métodos de Canje', type: 'array' },
      { key: 'contactDetails', label: 'Detalles de Contacto', type: 'textarea' },
      { key: 'socialMedia', label: 'Redes Sociales', type: 'textarea' },
      { key: 'businessReview', label: 'Reseña del Negocio', type: 'textarea' },
      { key: 'offerDetails', label: 'Detalles de la Oferta', type: 'textarea' },
    ],
  },
  {
    id: 7,
    key: 'estructura',
    title: 'Estructura',
    description: 'Estructura de la oferta',
    fields: [
      { key: 'pricingOptions', label: 'Opciones de Precio', type: 'array' },
    ],
  },
  {
    id: 8,
    key: 'informacion-adicional',
    title: 'Información Adicional',
    description: 'Campos específicos por categoría',
    fields: [
      // RESTAURANTE Template
      { key: 'restaurantValidDineIn', label: 'Válido para Comer en Local', type: 'select', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantValidTakeout', label: 'Válido para Llevar', type: 'select', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantValidDelivery', label: 'Válido para Delivery', type: 'select', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantDeliveryCost', label: 'Costo de Delivery', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantDeliveryAreas', label: 'Áreas de Delivery', type: 'textarea', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantOrderMethod', label: 'Método de Pedido', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantVouchersPerOrder', label: 'Vouchers por Orden', type: 'number', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantVoucherPersonRatio', label: 'Ratio Voucher/Persona', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantOrderTime', label: 'Hora de Pedido', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantKitchenClosingTime', label: 'Hora Cierre Cocina', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantValidFullMenu', label: 'Válido Menú Completo', type: 'select', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantApplicableBeverages', label: 'Bebidas Aplicables', type: 'textarea', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantExcessPayment', label: 'Pago de Excedente', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantOfferDishTypes', label: 'Tipos de Platos', type: 'textarea', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantExecutiveMenuIncluded', label: 'Menú Ejecutivo Incluido', type: 'select', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantHasTerrace', label: 'Tiene Terraza', type: 'select', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantLunchHours', label: 'Horario Almuerzo', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantDinnerHours', label: 'Horario Cena', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantChefName', label: 'Nombre del Chef', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantHouseSpecialty', label: 'Especialidad de la Casa', type: 'textarea', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantRequiresReservation', label: 'Requiere Reservación', type: 'select', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantChildAgeCount', label: 'Edad Niños', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantPrivateEvents', label: 'Eventos Privados', type: 'select', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantPrivateEventMinPeople', label: 'Mín Personas Evento', type: 'number', categorySpecific: true, template: 'RESTAURANTE' },
      { key: 'restaurantAlcoholSubstitution', label: 'Sustitución Alcohol', type: 'text', categorySpecific: true, template: 'RESTAURANTE' },
      
      // HOTEL Template
      { key: 'hotelCheckIn', label: 'Hora Check-In', type: 'text', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelCheckOut', label: 'Hora Check-Out', type: 'text', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelMaxBookingDate', label: 'Fecha Máx Reserva', type: 'date', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelLateCheckOut', label: 'Late Check-Out', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelLateCheckOutIncludesRoom', label: 'Late CO Incluye Habitación', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelMealTypes', label: 'Tipos de Comida', type: 'text', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelLunchDay', label: 'Día del Almuerzo', type: 'text', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelMealsIncluded', label: 'Comidas Incluidas', type: 'textarea', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelMenuDescription', label: 'Descripción Menú', type: 'textarea', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelIncludesITBMS', label: 'Incluye ITBMS', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelIncludesHotelTax', label: 'Incluye Impuesto Hotel', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelChildPolicy', label: 'Política Niños', type: 'textarea', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelMaxPeoplePerRoom', label: 'Máx Personas/Habitación', type: 'number', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelAdditionalPersonPrice', label: 'Precio Persona Adicional', type: 'text', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelAdditionalPersonIncludes', label: 'Incluye Persona Adicional', type: 'textarea', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelRoomType', label: 'Tipo de Habitación', type: 'text', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelHasWiFi', label: 'Tiene WiFi', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelAcceptsPets', label: 'Acepta Mascotas', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelPetWeightLimit', label: 'Límite Peso Mascota', type: 'text', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelPetCostPerDay', label: 'Costo Mascota/Día', type: 'text', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelPetLimit', label: 'Límite Mascotas', type: 'number', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelIncludesParking', label: 'Incluye Estacionamiento', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelValetParking', label: 'Valet Parking', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelConsecutiveVouchers', label: 'Vouchers Consecutivos', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelAllowsFoodBeverages', label: 'Permite Comida/Bebida', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelValidHolidays', label: 'Válido Feriados', type: 'select', categorySpecific: true, template: 'HOTEL' },
      { key: 'hotelValidSchoolHolidays', label: 'Válido Vacaciones Escolares', type: 'select', categorySpecific: true, template: 'HOTEL' },
      
      // PRODUCTOS Template
      { key: 'productWarranty', label: 'Garantía', type: 'text', categorySpecific: true, template: 'PRODUCTOS' },
      { key: 'productBrand', label: 'Marca', type: 'text', categorySpecific: true, template: 'PRODUCTOS' },
      { key: 'productModel', label: 'Modelo', type: 'text', categorySpecific: true, template: 'PRODUCTOS' },
      { key: 'productDimensions', label: 'Dimensiones', type: 'text', categorySpecific: true, template: 'PRODUCTOS' },
      { key: 'productCharacteristics', label: 'Características', type: 'textarea', categorySpecific: true, template: 'PRODUCTOS' },
      { key: 'productPickupLocation', label: 'Lugar de Retiro', type: 'text', categorySpecific: true, template: 'PRODUCTOS' },
      { key: 'productValidHolidays', label: 'Válido Feriados', type: 'select', categorySpecific: true, template: 'PRODUCTOS' },
      
      // EVENTOS Template
      { key: 'eventStartTime', label: 'Hora de Inicio', type: 'text', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventDoorsOpenTime', label: 'Hora Apertura Puertas', type: 'text', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventEndTime', label: 'Hora de Fin', type: 'text', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventMainArtistTime', label: 'Hora Artista Principal', type: 'text', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventTicketPickupStartTime', label: 'Inicio Retiro Boletos', type: 'text', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventTicketPickupEndTime', label: 'Fin Retiro Boletos', type: 'text', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventTicketPickupLocation', label: 'Lugar Retiro Boletos', type: 'text', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventOpeningArtist', label: 'Artista de Apertura', type: 'text', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventOpenBarDetails', label: 'Detalles Open Bar', type: 'textarea', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventMinimumAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'EVENTOS' },
      { key: 'eventChildrenPolicy', label: 'Política Niños', type: 'textarea', categorySpecific: true, template: 'EVENTOS' },
      
      // OBRAS (Teatro) Template
      { key: 'showDuration', label: 'Duración', type: 'text', categorySpecific: true, template: 'OBRAS' },
      { key: 'showLanguage', label: 'Idioma', type: 'text', categorySpecific: true, template: 'OBRAS' },
      { key: 'showTime', label: 'Hora de la Función', type: 'text', categorySpecific: true, template: 'OBRAS' },
      { key: 'showDoorsOpenTime', label: 'Hora Apertura Puertas', type: 'text', categorySpecific: true, template: 'OBRAS' },
      { key: 'showMinimumAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'OBRAS' },
      { key: 'showChildrenPolicy', label: 'Política Niños', type: 'textarea', categorySpecific: true, template: 'OBRAS' },
      
      // SEMINARIOS Template
      { key: 'courseFormat', label: 'Formato del Curso', type: 'select', categorySpecific: true, template: 'SEMINARIOS' },
      { key: 'courseAllowsChildren', label: 'Permite Niños', type: 'select', categorySpecific: true, template: 'SEMINARIOS' },
      { key: 'courseChildrenPolicy', label: 'Política Niños', type: 'textarea', categorySpecific: true, template: 'SEMINARIOS' },
      { key: 'courseLanguage', label: 'Idioma', type: 'text', categorySpecific: true, template: 'SEMINARIOS' },
      { key: 'courseDuration', label: 'Duración', type: 'text', categorySpecific: true, template: 'SEMINARIOS' },
      { key: 'courseIncludesRefreshments', label: 'Incluye Refrigerio', type: 'select', categorySpecific: true, template: 'SEMINARIOS' },
      { key: 'courseIncludesMaterials', label: 'Incluye Materiales', type: 'select', categorySpecific: true, template: 'SEMINARIOS' },
      { key: 'courseIncludesCertificate', label: 'Incluye Certificado', type: 'select', categorySpecific: true, template: 'SEMINARIOS' },
      { key: 'courseCertificateFormat', label: 'Formato Certificado', type: 'text', categorySpecific: true, template: 'SEMINARIOS' },
      
      // CURSOS_ACADEMICOS Template
      { key: 'academicHasTest', label: 'Tiene Examen', type: 'select', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicHasCertificate', label: 'Tiene Certificado', type: 'select', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicCertificateFormat', label: 'Formato Certificado', type: 'text', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicMinAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicLanguages', label: 'Idiomas', type: 'text', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicSyllabus', label: 'Temario', type: 'textarea', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicSchedule', label: 'Horario', type: 'text', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicEmailResponseTime', label: 'Tiempo Respuesta Email', type: 'text', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicOnlineCompletionTime', label: 'Tiempo Completar Online', type: 'text', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      { key: 'academicOnlineDevices', label: 'Dispositivos Online', type: 'text', categorySpecific: true, template: 'CURSOS_ACADEMICOS' },
      
      // MASCOTAS Template
      { key: 'petServiceIncludes', label: 'Servicio Incluye', type: 'textarea', categorySpecific: true, template: 'MASCOTAS' },
      { key: 'petServiceExcludes', label: 'Servicio No Incluye', type: 'textarea', categorySpecific: true, template: 'MASCOTAS' },
      { key: 'petAppliesTo', label: 'Aplica Para', type: 'text', categorySpecific: true, template: 'MASCOTAS' },
      { key: 'petRestrictions', label: 'Restricciones', type: 'textarea', categorySpecific: true, template: 'MASCOTAS' },
      { key: 'petServiceDuration', label: 'Duración del Servicio', type: 'text', categorySpecific: true, template: 'MASCOTAS' },
      { key: 'petDropOffTime', label: 'Hora de Entrega', type: 'text', categorySpecific: true, template: 'MASCOTAS' },
      { key: 'petRequiresReservation', label: 'Requiere Reservación', type: 'select', categorySpecific: true, template: 'MASCOTAS' },
      { key: 'petReservationAdvance', label: 'Anticipación Reserva', type: 'text', categorySpecific: true, template: 'MASCOTAS' },
      { key: 'petCancellationPolicy', label: 'Política Cancelación', type: 'textarea', categorySpecific: true, template: 'MASCOTAS' },
      
      // TOURS Template
      { key: 'tourDeparture', label: 'Lugar de Salida', type: 'text', categorySpecific: true, template: 'TOURS' },
      { key: 'tourReturn', label: 'Lugar de Retorno', type: 'text', categorySpecific: true, template: 'TOURS' },
      { key: 'tourIncludesMeals', label: 'Incluye Comidas', type: 'select', categorySpecific: true, template: 'TOURS' },
      { key: 'tourIncludesBeverages', label: 'Incluye Bebidas', type: 'select', categorySpecific: true, template: 'TOURS' },
      { key: 'tourMealTypes', label: 'Tipos de Comida', type: 'text', categorySpecific: true, template: 'TOURS' },
      { key: 'tourIncludesAlcohol', label: 'Incluye Alcohol', type: 'select', categorySpecific: true, template: 'TOURS' },
      { key: 'tourMenuDescription', label: 'Descripción Menú', type: 'textarea', categorySpecific: true, template: 'TOURS' },
      { key: 'tourRestrictions', label: 'Restricciones', type: 'textarea', categorySpecific: true, template: 'TOURS' },
      { key: 'tourIncludesGuide', label: 'Incluye Guía', type: 'select', categorySpecific: true, template: 'TOURS' },
      { key: 'tourAgeLimit', label: 'Límite de Edad', type: 'text', categorySpecific: true, template: 'TOURS' },
      { key: 'tourChildrenFreeAge', label: 'Edad Gratis Niños', type: 'text', categorySpecific: true, template: 'TOURS' },
      { key: 'tourChildrenMealsIncluded', label: 'Comidas Niños Incluidas', type: 'select', categorySpecific: true, template: 'TOURS' },
      { key: 'tourAcceptsPets', label: 'Acepta Mascotas', type: 'select', categorySpecific: true, template: 'TOURS' },
      { key: 'tourPetWeightLimit', label: 'Límite Peso Mascota', type: 'text', categorySpecific: true, template: 'TOURS' },
      { key: 'tourPetLimit', label: 'Límite Mascotas', type: 'number', categorySpecific: true, template: 'TOURS' },
      { key: 'tourValidSchoolHolidays', label: 'Válido Vacaciones', type: 'select', categorySpecific: true, template: 'TOURS' },
      { key: 'tourAllowsFoodBeverages', label: 'Permite Comida/Bebida', type: 'select', categorySpecific: true, template: 'TOURS' },
      
      // DENTAL Template
      { key: 'dentalAppliesToBraces', label: 'Aplica a Brackets', type: 'select', categorySpecific: true, template: 'DENTAL' },
      { key: 'dentalMinAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'DENTAL' },
      { key: 'dentalWhiteningType', label: 'Tipo de Blanqueamiento', type: 'text', categorySpecific: true, template: 'DENTAL' },
      { key: 'dentalXrayDelivery', label: 'Entrega Radiografía', type: 'text', categorySpecific: true, template: 'DENTAL' },
      { key: 'dentalContraindications', label: 'Contraindicaciones', type: 'textarea', categorySpecific: true, template: 'DENTAL' },
      { key: 'dentalValidHolidays', label: 'Válido Feriados', type: 'select', categorySpecific: true, template: 'DENTAL' },
      
      // GIMNASIOS Template
      { key: 'gymRegularClientRestriction', label: 'Restricción Cliente Regular', type: 'text', categorySpecific: true, template: 'GIMNASIOS' },
      { key: 'gymMembershipIncluded', label: 'Membresía Incluida', type: 'select', categorySpecific: true, template: 'GIMNASIOS' },
      { key: 'gymMembershipPrice', label: 'Precio Membresía', type: 'text', categorySpecific: true, template: 'GIMNASIOS' },
      { key: 'gymValidForGender', label: 'Válido para Género', type: 'select', categorySpecific: true, template: 'GIMNASIOS' },
      { key: 'gymMinAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'GIMNASIOS' },
      { key: 'gymMinMaxPeoplePerClass', label: 'Min/Max Personas/Clase', type: 'text', categorySpecific: true, template: 'GIMNASIOS' },
      { key: 'gymPackageStartDeadline', label: 'Límite Inicio Paquete', type: 'text', categorySpecific: true, template: 'GIMNASIOS' },
      
      // LABORATORIO Template
      { key: 'labMinAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'LABORATORIO' },
      { key: 'labFastingRequired', label: 'Requiere Ayuno', type: 'select', categorySpecific: true, template: 'LABORATORIO' },
      { key: 'labFastingDuration', label: 'Duración Ayuno', type: 'text', categorySpecific: true, template: 'LABORATORIO' },
      { key: 'labAppointmentType', label: 'Tipo de Cita', type: 'text', categorySpecific: true, template: 'LABORATORIO' },
      { key: 'labResultsTime', label: 'Tiempo de Resultados', type: 'text', categorySpecific: true, template: 'LABORATORIO' },
      { key: 'labResultsDelivery', label: 'Entrega de Resultados', type: 'text', categorySpecific: true, template: 'LABORATORIO' },
      { key: 'labSampleDeadline', label: 'Límite Toma Muestra', type: 'text', categorySpecific: true, template: 'LABORATORIO' },
      { key: 'labValidHolidays', label: 'Válido Feriados', type: 'select', categorySpecific: true, template: 'LABORATORIO' },
      
      // BELLEZA Templates (combined for brevity - they follow same pattern)
      { key: 'massageValidForGender', label: 'Válido para Género', type: 'select', categorySpecific: true, template: 'MASAJES' },
      { key: 'massageMinAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'MASAJES' },
      { key: 'massagePregnantAllowed', label: 'Permite Embarazadas', type: 'select', categorySpecific: true, template: 'MASAJES' },
      { key: 'massageCouplesValid', label: 'Válido Parejas', type: 'select', categorySpecific: true, template: 'MASAJES' },
      { key: 'massageCouplesExtraCost', label: 'Costo Extra Parejas', type: 'text', categorySpecific: true, template: 'MASAJES' },
      { key: 'massageBodyAreas', label: 'Áreas del Cuerpo', type: 'textarea', categorySpecific: true, template: 'MASAJES' },
      { key: 'massageDuration', label: 'Duración', type: 'text', categorySpecific: true, template: 'MASAJES' },
      { key: 'massageValidHolidays', label: 'Válido Feriados', type: 'select', categorySpecific: true, template: 'MASAJES' },
      
      // RECREACION Template
      { key: 'experienceDuration', label: 'Duración', type: 'text', categorySpecific: true, template: 'RECREACION' },
      { key: 'experienceIncludes', label: 'Incluye', type: 'textarea', categorySpecific: true, template: 'RECREACION' },
      { key: 'experienceExcludes', label: 'No Incluye', type: 'textarea', categorySpecific: true, template: 'RECREACION' },
      { key: 'experienceMinAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'RECREACION' },
      { key: 'experienceRestrictions', label: 'Restricciones', type: 'textarea', categorySpecific: true, template: 'RECREACION' },
      { key: 'experienceRequiresReservation', label: 'Requiere Reservación', type: 'select', categorySpecific: true, template: 'RECREACION' },
      { key: 'experienceReservationAdvance', label: 'Anticipación Reserva', type: 'text', categorySpecific: true, template: 'RECREACION' },
      { key: 'experienceCancellationPolicy', label: 'Política Cancelación', type: 'textarea', categorySpecific: true, template: 'RECREACION' },
      
      // INFANTIL Template
      { key: 'childExperienceDuration', label: 'Duración', type: 'text', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childExperienceIncludes', label: 'Incluye', type: 'textarea', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childExperienceExcludes', label: 'No Incluye', type: 'textarea', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childMinAge', label: 'Edad Mínima', type: 'number', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childAdultMustPay', label: 'Adulto Debe Pagar', type: 'select', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childAdultPrice', label: 'Precio Adulto', type: 'text', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childRestrictions', label: 'Restricciones', type: 'textarea', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childRequiresReservation', label: 'Requiere Reservación', type: 'select', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childReservationAdvance', label: 'Anticipación Reserva', type: 'text', categorySpecific: true, template: 'INFANTIL' },
      { key: 'childCancellationPolicy', label: 'Política Cancelación', type: 'textarea', categorySpecific: true, template: 'INFANTIL' },
    ],
  },
  {
    id: 9,
    key: 'politicas',
    title: 'Políticas',
    description: 'Políticas generales',
    fields: [
      { key: 'cancellationPolicy', label: 'Política de Cancelación', type: 'textarea' },
      { key: 'marketValidation', label: 'Validación de Mercado', type: 'select' },
      { key: 'additionalComments', label: 'Comentarios Adicionales', type: 'textarea' },
    ],
  },
]

/**
 * Get all unique templates from the field definitions
 */
export function getTemplates(): string[] {
  const templates = new Set<string>()
  REQUEST_FORM_STEPS.forEach(step => {
    step.fields.forEach(field => {
      if (field.template) {
        templates.add(field.template)
      }
    })
  })
  return Array.from(templates).sort()
}

/**
 * Get default required fields configuration
 * By default, only a few critical fields are required
 */
export function getDefaultRequestFormFieldsConfig(): Record<string, { required: boolean }> {
  const config: Record<string, { required: boolean }> = {}
  
  // Critical fields that should be required by default
  const defaultRequiredFields = [
    'businessName',
    'partnerEmail',
    'category',
    'startDate',
  ]
  
  REQUEST_FORM_STEPS.forEach(step => {
    step.fields.forEach(field => {
      config[field.key] = {
        required: defaultRequiredFields.includes(field.key),
      }
    })
  })
  
  return config
}

/**
 * Check if a field is required based on settings
 */
export function isFieldRequired(
  fieldKey: string,
  requestFormFields?: Record<string, { required: boolean }>
): boolean {
  if (!requestFormFields) {
    return false
  }
  return requestFormFields[fieldKey]?.required ?? false
}
