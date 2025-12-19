/**
 * Field Templates - Defines all field sets for different category types
 * 
 * Each template contains a set of fields that apply to specific categories.
 * Templates are mapped to categories in template-mapping.ts
 */

import type { FieldConfig } from './field-types'
import { COMMON_OPTIONS } from './field-types'

export interface FieldTemplate {
  displayName: string
  fields: FieldConfig[]
  infoNote?: string
}

// ============================================================
// EVENTOS - Conciertos, Festivales, Eventos Privados
// ============================================================
export const EVENTOS_TEMPLATE: FieldTemplate = {
  displayName: 'Eventos',
  fields: [
    { name: 'eventStartTime', type: 'text', label: 'El evento empieza a las:', placeholder: 'Ej: 8:00 PM' },
    { name: 'eventDoorsOpenTime', type: 'text', label: 'Puertas abren a las:', placeholder: 'Ej: 6:00 PM' },
    { name: 'eventEndTime', type: 'text', label: 'Termina:', placeholder: 'Ej: 11:00 PM' },
    { name: 'eventMainArtistTime', type: 'text', label: 'Artista o agrupación principal se presentará a las:', placeholder: 'Ej: 9:30 PM', fullWidth: true },
    { name: 'eventTicketPickupStartTime', type: 'text', label: '¿Desde qué hora se pueden retirar los boletos?', placeholder: 'Ej: 4:00 PM' },
    { name: 'eventTicketPickupEndTime', type: 'text', label: '¿Hasta qué hora se pueden retirar los boletos?', placeholder: 'Ej: 8:00 PM' },
    { name: 'eventTicketPickupLocation', type: 'textarea', label: '¿Dónde se retiran los boletos?', placeholder: 'Ubicación exacta...', fullWidth: true, rows: 2 },
    { name: 'eventOpeningArtist', type: 'text', label: 'Artista o agrupación que abre el evento o concierto:', placeholder: 'Nombre del artista...', fullWidth: true },
    { name: 'eventOpenBarDetails', type: 'textarea', label: 'Si hay open bar incluido, ¿qué tipo de bebidas/licores están incluidos?', placeholder: 'Ej: Cerveza, Ron, Vodka... o N/A', fullWidth: true, rows: 2 },
    { name: 'eventMinimumAge', type: 'text', label: '¿Desde qué edad se permite la entrada al evento?', placeholder: 'Ej: 18 años, Todas las edades...' },
    { name: 'eventChildrenPolicy', type: 'textarea', label: 'Si se permiten niños, especificar: desde qué edad se permiten, hasta qué edad es gratuito, y desde qué edad se paga boleto', placeholder: 'Ej: Niños desde 5 años, gratis hasta 10...', fullWidth: true, rows: 3 },
  ],
  infoNote: 'Para canjear esta oferta debes mostrar el voucher impreso o presentar la versión digital desde tu dispositivo móvil. Se recomienda no doblar el código QR. El email de confirmación de compra no es válido para canjear la oferta. No se aceptan devoluciones ni reembolsos. Prohibida la reventa de vouchers/boletos.',
}

// ============================================================
// OBRAS - Teatro
// ============================================================
export const OBRAS_TEMPLATE: FieldTemplate = {
  displayName: 'Obras de Teatro',
  fields: [
    { name: 'showDuration', type: 'text', label: 'Duración de la obra:', placeholder: 'Ej: 2 horas' },
    { name: 'showLanguage', type: 'text', label: 'Idioma:', placeholder: 'Ej: Español' },
    { name: 'showTime', type: 'text', label: 'Hora del show:', placeholder: 'Ej: 8:00 PM' },
    { name: 'showDoorsOpenTime', type: 'text', label: 'Hora en la que abren puertas:', placeholder: 'Ej: 7:00 PM' },
    { name: 'showMinimumAge', type: 'text', label: '¿Desde qué edad se permite la entrada a la obra?', placeholder: 'Ej: Todas las edades, 12 años...' },
    { name: 'showChildrenPolicy', type: 'textarea', label: 'Si se permiten niños, especificar: desde qué edad se permiten, hasta qué edad es gratuito, y desde qué edad se paga boleto', placeholder: 'Ej: Niños desde 5 años, gratis hasta 10...', fullWidth: true, rows: 3 },
  ],
  infoNote: 'No se permitirá entrar en la sala una vez comience la función. La producción se reserva el uso de las butacas una vez iniciada la función. No se aceptan reembolsos ni devoluciones. Prohibida la reventa de vouchers o boletos. Únicamente válido para la fecha adquirida al momento de la compra.',
}

// ============================================================
// SEMINARIOS - Cursos > Seminarios
// ============================================================
export const SEMINARIOS_TEMPLATE: FieldTemplate = {
  displayName: 'Seminarios',
  fields: [
    { name: 'courseFormat', type: 'select', label: '¿Es presencial u online?', options: [{ value: 'Presencial', label: 'Presencial' }, { value: 'Online', label: 'Online' }, { value: 'Híbrido', label: 'Híbrido' }] },
    { name: 'courseAllowsChildren', type: 'select', label: '¿Se permiten niños?', options: COMMON_OPTIONS.YES_NO },
    { name: 'courseChildrenPolicy', type: 'textarea', label: 'Si se permiten niños, especificar: desde qué edad se permiten, hasta qué edad es gratuito, y desde qué edad se paga boleto', placeholder: 'Ej: Niños desde 10 años...', fullWidth: true, rows: 2, showWhen: { field: 'courseAllowsChildren', value: 'Sí' } },
    { name: 'courseLanguage', type: 'text', label: '¿En qué idioma es el seminario?', placeholder: 'Ej: Español, Inglés...' },
    { name: 'courseDuration', type: 'text', label: '¿Cuál es la duración?', placeholder: 'Ej: 2 horas, 1 día...' },
    { name: 'courseIncludesRefreshments', type: 'select', label: '¿Incluye refrigerio?', options: COMMON_OPTIONS.YES_NO },
    { name: 'courseIncludesMaterials', type: 'select', label: '¿Brindarán material escrito?', options: COMMON_OPTIONS.YES_NO },
    { name: 'courseIncludesCertificate', type: 'select', label: '¿Incluye certificado de participación?', options: COMMON_OPTIONS.YES_NO },
    { name: 'courseCertificateFormat', type: 'select', label: '¿Físico o digital?', options: [{ value: 'Físico', label: 'Físico' }, { value: 'Digital', label: 'Digital' }, { value: 'Ambos', label: 'Ambos' }], showWhen: { field: 'courseIncludesCertificate', value: 'Sí' } },
  ],
}

// ============================================================
// CURSOS_ACADEMICOS - Cursos > Idiomas, Otros
// ============================================================
export const CURSOS_ACADEMICOS_TEMPLATE: FieldTemplate = {
  displayName: 'Cursos / Clases Académicos',
  fields: [
    { name: 'academicHasTest', type: 'select', label: '¿Se realiza prueba de conocimientos (test de nivelación)?', options: COMMON_OPTIONS.YES_NO },
    { name: 'academicHasCertificate', type: 'select', label: '¿Se da certificado?', options: COMMON_OPTIONS.YES_NO },
    { name: 'academicCertificateFormat', type: 'select', label: '¿Físico o digital?', options: [{ value: 'Físico', label: 'Físico' }, { value: 'Digital', label: 'Digital' }, { value: 'Ambos', label: 'Ambos' }], showWhen: { field: 'academicHasCertificate', value: 'Sí' } },
    { name: 'academicMinAge', type: 'text', label: '¿Desde qué edad se puede hacer?', placeholder: 'Ej: 18 años, Todas las edades...' },
    { name: 'academicLanguages', type: 'text', label: 'Idiomas en el que está disponible:', placeholder: 'Ej: Español, Inglés...' },
    { name: 'academicSyllabus', type: 'textarea', label: 'Temario:', placeholder: 'Descripción del contenido del curso...', fullWidth: true, rows: 4 },
    { name: 'academicSchedule', type: 'textarea', label: 'Horarios de clase:', placeholder: 'Ej: Lunes y Miércoles 6-8 PM...', fullWidth: true, rows: 2 },
    { name: 'academicEmailResponseTime', type: 'text', label: 'Si el canje es por correo, ¿cuánto tiempo puede tomar en recibirse respuesta?', placeholder: 'Ej: 24-48 horas', fullWidth: true },
    { name: 'academicOnlineCompletionTime', type: 'text', label: 'Si el curso es online: ¿cuánto tiempo se tiene para completar el curso una vez que se activa?', placeholder: 'Ej: 30 días, 6 meses...', fullWidth: true },
    { name: 'academicOnlineDevices', type: 'text', label: 'Si el curso es online: ¿en qué dispositivos se puede realizar?', placeholder: 'Ej: Computadora, tablet, celular...', fullWidth: true },
  ],
}

// ============================================================
// CURSO_COCINA - Cursos > Cocina
// ============================================================
export const CURSO_COCINA_TEMPLATE: FieldTemplate = {
  displayName: 'Curso de Cocina',
  fields: [
    { name: 'cookingDishes', type: 'textarea', label: '¿Qué platos se van a preparar?', placeholder: 'Lista de platos...', fullWidth: true, rows: 3 },
    { name: 'cookingRequiresExperience', type: 'select', label: '¿Se requiere experiencia?', options: COMMON_OPTIONS.YES_NO },
    { name: 'cookingDuration', type: 'text', label: '¿Cuánto tiempo dura la clase?', placeholder: 'Ej: 3 horas' },
    { name: 'cookingSchedule', type: 'textarea', label: 'Fechas y horarios disponibles:', placeholder: 'Ej: Sábados 10 AM...', fullWidth: true, rows: 2 },
    { name: 'cookingAgeRange', type: 'text', label: '¿Desde cuál y hasta qué edad es válido?', placeholder: 'Ej: 12 a 65 años', fullWidth: true },
  ],
}

// ============================================================
// HOTEL - Hoteles (all)
// ============================================================
export const HOTEL_TEMPLATE: FieldTemplate = {
  displayName: 'Hoteles',
  fields: [
    { name: 'hotelCheckIn', type: 'text', label: 'Check-in:', placeholder: 'Ej: 3:00 PM' },
    { name: 'hotelCheckOut', type: 'text', label: 'Check-out:', placeholder: 'Ej: 11:00 AM' },
    { name: 'hotelMaxBookingDate', type: 'text', label: 'Fecha máxima en la que se puede contactar al hotel para hacer la reserva:', placeholder: 'Ej: 7 días antes...', fullWidth: true },
    { name: 'hotelLateCheckOut', type: 'text', label: 'Late Check out:', placeholder: 'Ej: 2:00 PM' },
    { name: 'hotelLateCheckOutIncludesRoom', type: 'select', label: '¿Late Check out incluye habitación?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hotelMealTypes', type: 'textarea', label: '¿Qué tipo de comidas ofrecen?', placeholder: 'Ej: Desayuno, Almuerzo, Cena, Todo Incluido...', fullWidth: true, rows: 2 },
    { name: 'hotelLunchDay', type: 'select', label: 'Si incluye almuerzo, ¿qué día es? (entrada o salida)', options: [{ value: 'Entrada', label: 'Entrada' }, { value: 'Salida', label: 'Salida' }, { value: 'No aplica', label: 'No aplica' }] },
    { name: 'hotelMealsIncluded', type: 'text', label: '¿Incluye 1 o más comidas?', placeholder: 'Ej: 1 comida, 2 comidas...' },
    { name: 'hotelMenuDescription', type: 'textarea', label: 'Descripción del menú ofrecido:', placeholder: 'Ej: Menú buffet internacional...', fullWidth: true, rows: 3 },
    { name: 'hotelIncludesITBMS', type: 'select', label: 'Incluye ITBMS (7%)?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hotelIncludesHotelTax', type: 'select', label: 'Incluye impuesto Hotelero (10%)?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hotelChildPolicy', type: 'textarea', label: '¿Los niños hasta qué edad no pagan estadía? ¿De no pagar se les incluye las comidas?', placeholder: 'Ej: Niños hasta 5 años no pagan...', fullWidth: true, rows: 2 },
    { name: 'hotelMaxPeoplePerRoom', type: 'text', label: 'Cantidad máxima de personas por habitación:', placeholder: 'Ej: 2, 3, 4...' },
    { name: 'hotelAdditionalPersonPrice', type: 'text', label: 'Precio por persona adicional:', placeholder: 'Ej: $25, $30...' },
    { name: 'hotelAdditionalPersonIncludes', type: 'textarea', label: 'Indicar si el precio por persona adicional incluye desayuno e impuestos:', placeholder: 'Ej: Incluye desayuno e impuestos...', fullWidth: true, rows: 2 },
    { name: 'hotelRoomType', type: 'textarea', label: 'Tipo de habitación y tipo de cama(s):', placeholder: 'Ej: Habitación estándar con cama king...', fullWidth: true, rows: 2 },
    { name: 'hotelHasWiFi', type: 'select', label: '¿Hay WiFi en el hotel? ¿Es gratuito?', options: [{ value: 'Sí, gratuito', label: 'Sí, gratuito' }, { value: 'Sí, con costo', label: 'Sí, con costo' }, { value: 'No', label: 'No' }] },
    { name: 'hotelAcceptsPets', type: 'select', label: '¿Se aceptan mascotas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hotelPetWeightLimit', type: 'text', label: 'Si se aceptan ¿Hay un límite de peso?', placeholder: 'Ej: 20 kg...', showWhen: { field: 'hotelAcceptsPets', value: 'Sí' } },
    { name: 'hotelPetCostPerDay', type: 'text', label: 'Si se aceptan ¿Cuál es el costo por día?', placeholder: 'Ej: $10, $15...', showWhen: { field: 'hotelAcceptsPets', value: 'Sí' } },
    { name: 'hotelPetLimit', type: 'text', label: 'Si se aceptan, ¿hay una cantidad límite de mascotas?', placeholder: 'Ej: 1, 2...', showWhen: { field: 'hotelAcceptsPets', value: 'Sí' } },
    { name: 'hotelIncludesParking', type: 'select', label: '¿Incluye Estacionamiento?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hotelValetParking', type: 'select', label: '¿Es Valet Parking?', options: COMMON_OPTIONS.YES_NO, showWhen: { field: 'hotelIncludesParking', value: 'Sí' } },
    { name: 'hotelConsecutiveVouchers', type: 'textarea', label: '¿Se permiten utilizar vouchers consecutivamente para alargar la estadía? ¿Hay un máximo?', placeholder: 'Ej: Sí, máximo 3 noches...', fullWidth: true, rows: 2 },
    { name: 'hotelAllowsFoodBeverages', type: 'select', label: '¿Se permite el ingreso de alimentos o bebidas?', options: [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }, { value: 'Con restricciones', label: 'Con restricciones' }] },
    { name: 'hotelValidHolidays', type: 'textarea', label: '¿La oferta es válida para días feriados? (Por favor especificar)', placeholder: 'Ej: Válido excepto Navidad...', fullWidth: true, rows: 2 },
    { name: 'hotelValidSchoolHolidays', type: 'textarea', label: '¿La oferta es válida para vacaciones escolares? (Por favor especificar)', placeholder: 'Ej: Válido excepto Semana Santa...', fullWidth: true, rows: 2 },
  ],
  infoNote: 'Para Ofertas de 2 noches, colocar que deben ser "consecutivas".',
}

// ============================================================
// RESTAURANTE - Restaurantes (all)
// ============================================================
export const RESTAURANTE_TEMPLATE: FieldTemplate = {
  displayName: 'Restaurantes',
  fields: [
    { name: 'restaurantValidDineIn', type: 'select', label: '¿Válido para consumir en el restaurante?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantValidTakeout', type: 'select', label: '¿Válido para pedidos para llevar?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantValidDelivery', type: 'select', label: '¿Válido para pedidos a domicilio?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantDeliveryCost', type: 'select', label: '¿Gratis o tiene costo adicional?', options: [{ value: 'Gratis', label: 'Gratis' }, { value: 'Costo adicional', label: 'Costo adicional' }], showWhen: { field: 'restaurantValidDelivery', value: 'Sí' } },
    { name: 'restaurantDeliveryAreas', type: 'textarea', label: '¿Qué áreas cubre el servicio a domicilio?', placeholder: 'Ej: Panamá Centro, San Francisco...', fullWidth: true, rows: 2, showWhen: { field: 'restaurantValidDelivery', value: 'Sí' } },
    { name: 'restaurantOrderMethod', type: 'select', label: '¿El pedido es por chat/whatsapp o por llamada?', options: [{ value: 'Chat/WhatsApp', label: 'Chat/WhatsApp' }, { value: 'Llamada', label: 'Llamada' }, { value: 'Ambos', label: 'Ambos' }], showWhen: { field: 'restaurantValidDelivery', value: 'Sí' } },
    { name: 'restaurantVouchersPerOrder', type: 'text', label: '¿Cuántos vouchers pueden ser usados por pedido/reserva/mesa?', placeholder: 'Ej: 1, 2, Sin límite...' },
    { name: 'restaurantVoucherPersonRatio', type: 'select', label: '¿Aplica 1 voucher mínimo 1 persona, 2 vouchers mínimo 4 personas, y así sucesivamente?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantOrderTime', type: 'text', label: '¿Cuánto tiempo toma el pedido aproximadamente?', placeholder: 'Ej: 30-45 minutos' },
    { name: 'restaurantKitchenClosingTime', type: 'text', label: '¿A qué hora cierra la cocina o hasta qué hora se aceptan pedidos?', placeholder: 'Ej: 10:00 PM' },
    { name: 'restaurantValidFullMenu', type: 'select', label: '¿Válido para todo el menú?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantApplicableBeverages', type: 'textarea', label: '¿Qué bebidas aplican?', placeholder: 'Ej: Sodas, jugos, cervezas...', fullWidth: true, rows: 2 },
    { name: 'restaurantExcessPayment', type: 'select', label: 'De excederse del crédito, ¿aceptan pagos con tarjetas o solo efectivo?', options: [{ value: 'Tarjetas y efectivo', label: 'Tarjetas y efectivo' }, { value: 'Solo efectivo', label: 'Solo efectivo' }, { value: 'Solo tarjetas', label: 'Solo tarjetas' }] },
    { name: 'restaurantOfferDishTypes', type: 'textarea', label: 'Tipo de comidas/platos que quiere ofrecer en la oferta:', placeholder: 'Ej: Entradas, platos fuertes, postres...', fullWidth: true, rows: 2 },
    { name: 'restaurantExecutiveMenuIncluded', type: 'select', label: '¿El menú ejecutivo está incluido en la oferta?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantHasTerrace', type: 'select', label: '¿Posee terraza?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantLunchHours', type: 'text', label: 'Horario de almuerzo:', placeholder: 'Ej: 12:00 PM - 3:00 PM' },
    { name: 'restaurantDinnerHours', type: 'text', label: 'Horario cena:', placeholder: 'Ej: 6:00 PM - 10:00 PM' },
    { name: 'restaurantChefName', type: 'text', label: 'Chef (solo llenar si desea incluir al chef en la oferta):', placeholder: 'Nombre del chef', fullWidth: true },
    { name: 'restaurantHouseSpecialty', type: 'text', label: 'Especialidad de la casa:', placeholder: 'Ej: Paella, Ceviche...', fullWidth: true },
    { name: 'restaurantRequiresReservation', type: 'select', label: '¿Requiere reservación previa?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantChildAgeCount', type: 'text', label: '¿Niños a partir de qué edad cuentan como 1 persona?', placeholder: 'Ej: 12 años' },
    { name: 'restaurantPrivateEvents', type: 'select', label: '¿Aplica para eventos privados?', options: COMMON_OPTIONS.YES_NO },
    { name: 'restaurantPrivateEventMinPeople', type: 'text', label: '¿A partir de cuántas personas se considera evento privado?', placeholder: 'Ej: 15 personas', showWhen: { field: 'restaurantPrivateEvents', value: 'Sí' } },
    { name: 'restaurantAlcoholSubstitution', type: 'textarea', label: 'En caso que incluya bebida alcohólica, ¿se puede cambiar por otra bebida no alcohólica? ¿Cuál?', placeholder: 'Ej: Sí, por jugo o soda...', fullWidth: true, rows: 2 },
  ],
}

// ============================================================
// PRODUCTOS - Productos (all)
// ============================================================
export const PRODUCTOS_TEMPLATE: FieldTemplate = {
  displayName: 'Productos',
  fields: [
    { name: 'productWarranty', type: 'text', label: 'Garantía:', placeholder: 'Ej: 1 año, 6 meses...' },
    { name: 'productBrand', type: 'text', label: 'Marca:', placeholder: 'Nombre de la marca' },
    { name: 'productModel', type: 'text', label: 'Modelo:', placeholder: 'Modelo del producto' },
    { name: 'productDimensions', type: 'text', label: 'Dimensión del producto (largo, ancho y alto):', placeholder: 'Ej: 50x30x20 cm', fullWidth: true },
    { name: 'productCharacteristics', type: 'textarea', label: 'Características del producto (material, color, función, envase, calidad, diseño, etc.):', placeholder: 'Descripción detallada...', fullWidth: true, rows: 4 },
    { name: 'productPickupLocation', type: 'textarea', label: 'Lugar de retiro o si es con envío:', placeholder: 'Dirección o detalles de envío...', fullWidth: true, rows: 2 },
    { name: 'productValidHolidays', type: 'select', label: '¿Válido para retiro o entrega a domicilio en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// ============================================================
// MASCOTAS - Mascotas (all)
// ============================================================
export const MASCOTAS_TEMPLATE: FieldTemplate = {
  displayName: 'Mascotas',
  fields: [
    { name: 'petServiceIncludes', type: 'textarea', label: '¿Qué incluye el servicio?', placeholder: 'Descripción detallada...', fullWidth: true, rows: 3 },
    { name: 'petServiceExcludes', type: 'textarea', label: '¿Qué NO incluye el servicio que sea importante mencionar?', placeholder: 'Ej: No incluye medicamentos...', fullWidth: true, rows: 2 },
    { name: 'petAppliesTo', type: 'text', label: '¿Para qué mascotas aplica? (perros, gatos, etc.)', placeholder: 'Ej: Perros y gatos', fullWidth: true },
    { name: 'petRestrictions', type: 'textarea', label: 'Restricciones (razas, peso, etc.):', placeholder: 'Ej: No aplica para razas grandes...', fullWidth: true, rows: 2 },
    { name: 'petServiceDuration', type: 'text', label: 'Duración del servicio:', placeholder: 'Ej: 1 hora, 2 horas...' },
    { name: 'petDropOffTime', type: 'text', label: '¿Hasta qué hora se reciben a las mascotas? (si aplica)', placeholder: 'Ej: 5:00 PM' },
    { name: 'petRequiresReservation', type: 'select', label: '¿Requiere reservación?', options: COMMON_OPTIONS.YES_NO },
    { name: 'petReservationAdvance', type: 'text', label: 'De responder sí, ¿con cuánto tiempo de anticipación se debe hacer?', placeholder: 'Ej: 24 horas, 2 días...', showWhen: { field: 'petRequiresReservation', value: 'Sí' } },
    { name: 'petCancellationPolicy', type: 'textarea', label: 'Políticas de cancelación (si tiene):', placeholder: 'Descripción de la política...', fullWidth: true, rows: 2 },
  ],
}

// ============================================================
// TOURS - Turismo & Tours (all)
// ============================================================
export const TOURS_TEMPLATE: FieldTemplate = {
  displayName: 'Tours y Actividades al Aire Libre',
  fields: [
    { name: 'tourDeparture', type: 'text', label: 'Partida:', placeholder: 'Ej: 7:00 AM' },
    { name: 'tourReturn', type: 'text', label: 'Regreso:', placeholder: 'Ej: 5:00 PM' },
    { name: 'tourIncludesMeals', type: 'select', label: '¿Incluye comidas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'tourIncludesBeverages', type: 'select', label: '¿Incluye bebidas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'tourMealTypes', type: 'textarea', label: '¿Qué tipo de comidas/bebidas ofrecen?', placeholder: 'Ej: Almuerzo buffet, snacks...', fullWidth: true, rows: 2, showWhen: { field: 'tourIncludesMeals', value: 'Sí' } },
    { name: 'tourIncludesAlcohol', type: 'select', label: '¿Incluye bebidas alcohólicas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'tourMenuDescription', type: 'textarea', label: 'Descripción del menú ofrecido:', placeholder: 'Descripción detallada...', fullWidth: true, rows: 2, showWhen: { field: 'tourIncludesMeals', value: 'Sí' } },
    { name: 'tourRestrictions', type: 'textarea', label: '¿Hay alguna restricción (general o de movilidad)?', placeholder: 'Ej: No apto para personas con problemas cardíacos...', fullWidth: true, rows: 2 },
    { name: 'tourIncludesGuide', type: 'select', label: '¿Incluye guía turístico?', options: COMMON_OPTIONS.YES_NO },
    { name: 'tourAgeLimit', type: 'text', label: '¿Hay un límite de edad?', placeholder: 'Ej: De 5 a 70 años' },
    { name: 'tourChildrenFreeAge', type: 'text', label: '¿Los niños hasta qué edad no pagan?', placeholder: 'Ej: Hasta 5 años' },
    { name: 'tourChildrenMealsIncluded', type: 'select', label: '¿De no pagar se les incluye las comidas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'tourAcceptsPets', type: 'select', label: '¿Se aceptan mascotas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'tourPetWeightLimit', type: 'text', label: 'Si se aceptan, ¿hay un límite de peso?', placeholder: 'Ej: 10 kg', showWhen: { field: 'tourAcceptsPets', value: 'Sí' } },
    { name: 'tourPetLimit', type: 'text', label: 'Si se aceptan, ¿hay una cantidad límite de mascotas?', placeholder: 'Ej: 1 por persona', showWhen: { field: 'tourAcceptsPets', value: 'Sí' } },
    { name: 'tourValidSchoolHolidays', type: 'textarea', label: '¿La oferta es válida para vacaciones escolares? (Por favor especificar)', placeholder: 'Ej: Válido todo el año...', fullWidth: true, rows: 2 },
    { name: 'tourAllowsFoodBeverages', type: 'select', label: '¿Se permite el ingreso de alimentos o bebidas?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// ============================================================
// DENTAL - Dental & Estética Dental (all)
// ============================================================
export const DENTAL_TEMPLATE: FieldTemplate = {
  displayName: 'Tratamientos Dentales',
  fields: [
    { name: 'dentalAppliesToBraces', type: 'select', label: '¿La limpieza dental aplica para personas con frenos?', options: COMMON_OPTIONS.YES_NO },
    { name: 'dentalMinAge', type: 'text', label: '¿Desde qué edad se puede recibir el o los tratamientos?', placeholder: 'Ej: 18 años, Todas las edades...' },
    { name: 'dentalWhiteningType', type: 'textarea', label: 'Para ofertas que incluyen blanqueamiento, ¿qué tipo? (Peróxido de hidrógeno, Láser, Kit casero)', placeholder: 'Descripción del tipo...', fullWidth: true, rows: 2 },
    { name: 'dentalXrayDelivery', type: 'select', label: 'Si hay radiografías, ¿se imprimen o solo se envían por correo?', options: [{ value: 'Impresas', label: 'Impresas' }, { value: 'Por correo', label: 'Por correo' }, { value: 'Ambas', label: 'Ambas' }] },
    { name: 'dentalContraindications', type: 'textarea', label: 'Contraindicaciones:', placeholder: 'Ej: No aplica para embarazadas...', fullWidth: true, rows: 2 },
    { name: 'dentalValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// ============================================================
// GIMNASIOS - Gimnasios & Fitness (all)
// ============================================================
export const GIMNASIOS_TEMPLATE: FieldTemplate = {
  displayName: 'Ejercicio - Gimnasios',
  fields: [
    { name: 'gymRegularClientRestriction', type: 'select', label: '¿Hay restricción para clientes regulares?', options: COMMON_OPTIONS.YES_NO },
    { name: 'gymMembershipIncluded', type: 'select', label: 'Si hay membresía o matrícula, ¿está incluida?', options: [{ value: 'Incluida', label: 'Incluida' }, { value: 'Exonerada solo para voucher', label: 'Exonerada solo para voucher' }, { value: 'No incluida', label: 'No incluida' }] },
    { name: 'gymMembershipPrice', type: 'text', label: 'Si no la incluye, indique el precio:', placeholder: 'Ej: $25', showWhen: { field: 'gymMembershipIncluded', value: 'No incluida' } },
    { name: 'gymValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'gymMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 16 años' },
    { name: 'gymMinMaxPeoplePerClass', type: 'text', label: 'Mínimo y máximo de personas por clase, si aplica:', placeholder: 'Ej: 5 mín, 20 máx' },
    { name: 'gymPackageStartDeadline', type: 'text', label: '¿Hay un último día de inicio de paquete que sea antes de la fecha de expiración?', placeholder: 'Ej: 30 días antes...', fullWidth: true },
  ],
}

// ============================================================
// LABORATORIO - Laboratorios y Salud Clínica (all)
// ============================================================
export const LABORATORIO_TEMPLATE: FieldTemplate = {
  displayName: 'Exámenes de Laboratorio',
  fields: [
    { name: 'labMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: Todas las edades, 18 años...' },
    { name: 'labFastingRequired', type: 'select', label: '¿Hay que ir en ayuno?', options: COMMON_OPTIONS.YES_NO },
    { name: 'labFastingDuration', type: 'text', label: '¿De cuánto tiempo?', placeholder: 'Ej: 8-12 horas', showWhen: { field: 'labFastingRequired', value: 'Sí' } },
    { name: 'labAppointmentType', type: 'select', label: '¿Es por orden de llegada o con cita?', options: [{ value: 'Orden de llegada', label: 'Orden de llegada' }, { value: 'Con cita', label: 'Con cita' }, { value: 'Ambos', label: 'Ambos' }] },
    { name: 'labResultsTime', type: 'text', label: '¿En cuánto tiempo están listos los resultados?', placeholder: 'Ej: 24-48 horas' },
    { name: 'labResultsDelivery', type: 'select', label: '¿Por qué medio se entregan los resultados?', options: [{ value: 'Correo electrónico', label: 'Correo electrónico' }, { value: 'En persona', label: 'En persona' }, { value: 'Portal web', label: 'Portal web' }, { value: 'Varios', label: 'Varios' }] },
    { name: 'labSampleDeadline', type: 'text', label: '¿Hasta qué hora se toman las muestras?', placeholder: 'Ej: 11:00 AM' },
    { name: 'labValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// ============================================================
// DONACION - Comunidad OS
// ============================================================
export const DONACION_TEMPLATE: FieldTemplate = {
  displayName: 'Comunidad OS - Donación',
  fields: [
    { name: 'donationContactEmail', type: 'text', label: '¿A qué correo/número se debe contactar para recibir el recibo de donación?', placeholder: 'correo@fundacion.org', fullWidth: true },
    { name: 'donationReceiptDeadline', type: 'text', label: '¿Hasta qué fecha se permite el reclamo del recibo de donación?', placeholder: 'Ej: 30 días después de la donación', fullWidth: true },
  ],
  infoNote: '100% de tu donación va directamente a LA FUNDACIÓN. OfertaSimple pagará todos los cargos de tarjetas de crédito. Puedes donar cuantas veces lo desees. Al ser una donación, no es necesario apersonarse a ninguna de las sedes de la fundación.',
}

// ============================================================
// CATERING - Servicios > Catering
// ============================================================
export const CATERING_TEMPLATE: FieldTemplate = {
  displayName: 'Catering',
  fields: [
    { name: 'cateringValidPickup', type: 'select', label: '¿Válido para retiro en el local?', options: COMMON_OPTIONS.YES_NO },
    { name: 'cateringValidDelivery', type: 'select', label: '¿Válido para entrega a domicilio?', options: COMMON_OPTIONS.YES_NO },
    { name: 'cateringDeliveryCost', type: 'select', label: '¿Gratis o tiene costo adicional?', options: [{ value: 'Gratis', label: 'Gratis' }, { value: 'Costo adicional', label: 'Costo adicional' }], showWhen: { field: 'cateringValidDelivery', value: 'Sí' } },
    { name: 'cateringDeliveryAreas', type: 'textarea', label: '¿Qué áreas cubre la entrega a domicilio?', placeholder: 'Ej: Ciudad de Panamá, San Miguelito...', fullWidth: true, rows: 2, showWhen: { field: 'cateringValidDelivery', value: 'Sí' } },
    { name: 'cateringOrderMethod', type: 'select', label: '¿El pedido es por chat/whatsapp o por llamada?', options: [{ value: 'Chat/WhatsApp', label: 'Chat/WhatsApp' }, { value: 'Llamada', label: 'Llamada' }, { value: 'Ambos', label: 'Ambos' }], showWhen: { field: 'cateringValidDelivery', value: 'Sí' } },
    { name: 'cateringVouchersPerOrder', type: 'text', label: '¿Cuántos vouchers pueden ser usados por pedido?', placeholder: 'Ej: 1, 2, Sin límite...' },
    { name: 'cateringAdvanceTime', type: 'text', label: '¿Con cuánto tiempo de anticipación se debe hacer el pedido?', placeholder: 'Ej: 48 horas, 1 semana...' },
    { name: 'cateringIncludesEventService', type: 'select', label: '¿Incluye servicio en el evento?', options: COMMON_OPTIONS.YES_NO },
    { name: 'cateringEventServiceDuration', type: 'text', label: 'De responder sí, ¿cuánto tiempo dura el servicio?', placeholder: 'Ej: 4 horas', showWhen: { field: 'cateringIncludesEventService', value: 'Sí' } },
  ],
}

// ============================================================
// FOTOGRAFIA - Servicios > Fotografía
// ============================================================
export const FOTOGRAFIA_TEMPLATE: FieldTemplate = {
  displayName: 'Fotografía',
  fields: [
    { name: 'photoSessionDuration', type: 'text', label: '¿Cuánto dura la sesión?', placeholder: 'Ej: 1 hora, 2 horas...' },
    { name: 'photoSessionLocation', type: 'select', label: '¿La sesión aplica para fotos en estudio, y/o exteriores?', options: [{ value: 'Estudio', label: 'Estudio' }, { value: 'Exteriores', label: 'Exteriores' }, { value: 'Ambos', label: 'Ambos' }] },
    { name: 'photoExteriorAreas', type: 'textarea', label: 'Si es en exteriores, ¿cuáles son las áreas donde se permite?', placeholder: 'Ej: Casco Viejo, parques de la ciudad...', fullWidth: true, rows: 2, showWhen: { field: 'photoSessionLocation', value: ['Exteriores', 'Ambos'] } },
    { name: 'photoSessionTypes', type: 'select', label: '¿Aplica para fotos pre-boda, embarazadas y quinceañera?', options: COMMON_OPTIONS.YES_NO },
    { name: 'photoAdditionalPeople', type: 'textarea', label: '¿Cuántas personas se pueden añadir y cuál es el costo por cada una?', placeholder: 'Ej: Hasta 3 personas, $20 adicional c/u...', fullWidth: true, rows: 2 },
    { name: 'photoCombineVouchers', type: 'select', label: '¿Se pueden usar 2 vouchers para combinarlos y alargar la sesión?', options: COMMON_OPTIONS.YES_NO },
    { name: 'photoPetsAllowed', type: 'select', label: '¿Se pueden añadir mascotas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'photoPetsCost', type: 'text', label: '¿Tiene costo adicional?', placeholder: 'Ej: Sí, $15 adicional', showWhen: { field: 'photoPetsAllowed', value: 'Sí' } },
    { name: 'photoOutfitChanges', type: 'text', label: '¿Cuántos cambios se permiten?', placeholder: 'Ej: 2 cambios' },
    { name: 'photoIncludesMakeup', type: 'select', label: '¿Incluye maquillaje?', options: COMMON_OPTIONS.YES_NO },
    { name: 'photoDeliveryType', type: 'select', label: '¿Se entregan todas las fotos tomadas o solo las editadas/impresas?', options: [{ value: 'Todas las fotos', label: 'Todas las fotos' }, { value: 'Solo editadas', label: 'Solo editadas' }, { value: 'Solo impresas', label: 'Solo impresas' }] },
    { name: 'photoValidWeekends', type: 'textarea', label: '¿Válido para sesiones en feriados y/o fines de semana? (especificar)', placeholder: 'Ej: Válido fines de semana, cargo adicional en feriados...', fullWidth: true, rows: 2 },
  ],
}

// ============================================================
// OPTICAS - Servicios > Ópticas
// ============================================================
export const OPTICAS_TEMPLATE: FieldTemplate = {
  displayName: 'Ópticas',
  fields: [
    { name: 'opticsIncludesExam', type: 'select', label: '¿Incluye examen de vista?', options: COMMON_OPTIONS.YES_NO },
    { name: 'opticsIncludesPrescription', type: 'select', label: '¿Incluye receta?', options: COMMON_OPTIONS.YES_NO },
    { name: 'opticsAppliesToContacts', type: 'select', label: '¿Aplica para lentes de contacto?', options: COMMON_OPTIONS.YES_NO },
    { name: 'opticsAppliesToSunglasses', type: 'select', label: '¿Aplica para lentes de sol?', options: COMMON_OPTIONS.YES_NO },
    { name: 'opticsFrameOnly', type: 'select', label: '¿Aplica para personas que tienen el lente y solo quieren el aro?', options: COMMON_OPTIONS.YES_NO },
    { name: 'opticsAllBrands', type: 'select', label: '¿Aplica para todas las marcas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'opticsRestrictions', type: 'textarea', label: 'Restricciones (dioptrías, astigmatismo, etc.):', placeholder: 'Ej: Hasta 4 dioptrías...', fullWidth: true, rows: 2 },
  ],
  infoNote: 'De excederse del crédito, se debe cancelar el saldo de la compra en su totalidad directamente en el local. No es válido con otras promociones, paquetes económicos, o descuentos de jubilado, asegurado o corporativos.',
}

// ============================================================
// ALQUILER_VESTIDOS - Servicios > Alquiler de vestidos
// ============================================================
export const ALQUILER_VESTIDOS_TEMPLATE: FieldTemplate = {
  displayName: 'Alquiler de Vestidos',
  fields: [
    { name: 'dressAvailableSizes', type: 'textarea', label: '¿Qué tallas de vestidos están disponibles?', placeholder: 'Ej: XS, S, M, L, XL...', fullWidth: true, rows: 2 },
    { name: 'dressIncludesTailoring', type: 'select', label: '¿Incluye el entalle del vestido?', options: COMMON_OPTIONS.YES_NO },
    { name: 'dressRequiresDeposit', type: 'select', label: '¿Se debe pagar un depósito?', options: COMMON_OPTIONS.YES_NO },
    { name: 'dressDepositAmount', type: 'text', label: 'De responder sí, ¿de cuánto es el depósito?', placeholder: 'Ej: $100', showWhen: { field: 'dressRequiresDeposit', value: 'Sí' } },
    { name: 'dressPickupReturnPolicy', type: 'textarea', label: 'Políticas de retiro y de devolución de la ropa:', placeholder: 'Descripción de las políticas...', fullWidth: true, rows: 3 },
  ],
  infoNote: 'El depósito de garantía no cubre daños graves al vestido. En caso de entregar el vestido con un daño irreparable deberás pagar el importe del vestido en su totalidad.',
}

// ============================================================
// RECREACION - Actividades > Al Aire Libre, Recreación, Yates
// ============================================================
export const RECREACION_TEMPLATE: FieldTemplate = {
  displayName: 'Recreación y Experiencias',
  fields: [
    { name: 'experienceDuration', type: 'text', label: 'Duración de la experiencia:', placeholder: 'Ej: 2 horas, medio día...' },
    { name: 'experienceIncludes', type: 'textarea', label: '¿Qué incluye la experiencia?', placeholder: 'Descripción detallada...', fullWidth: true, rows: 3 },
    { name: 'experienceExcludes', type: 'textarea', label: '¿Qué NO incluye la experiencia que sea importante mencionar?', placeholder: 'Ej: No incluye transporte...', fullWidth: true, rows: 2 },
    { name: 'experienceMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 8 años, Todas las edades...' },
    { name: 'experienceRestrictions', type: 'textarea', label: 'Restricciones:', placeholder: 'Ej: No apto para embarazadas...', fullWidth: true, rows: 2 },
    { name: 'experienceRequiresReservation', type: 'select', label: '¿Requiere reservación?', options: COMMON_OPTIONS.YES_NO },
    { name: 'experienceReservationAdvance', type: 'text', label: 'De responder sí, ¿con cuánto tiempo de anticipación?', placeholder: 'Ej: 24 horas, 1 semana...', showWhen: { field: 'experienceRequiresReservation', value: 'Sí' } },
    { name: 'experienceCancellationPolicy', type: 'textarea', label: 'Políticas de cancelación (si tiene):', placeholder: 'Descripción de la política...', fullWidth: true, rows: 2 },
  ],
}

// ============================================================
// INFANTIL - Actividades > Infantiles
// ============================================================
export const INFANTIL_TEMPLATE: FieldTemplate = {
  displayName: 'Actividades Infantiles',
  fields: [
    { name: 'childExperienceDuration', type: 'text', label: 'Duración de la experiencia:', placeholder: 'Ej: 2 horas' },
    { name: 'childExperienceIncludes', type: 'textarea', label: '¿Qué incluye la experiencia?', placeholder: 'Descripción detallada...', fullWidth: true, rows: 3 },
    { name: 'childExperienceExcludes', type: 'textarea', label: '¿Qué NO incluye la experiencia que sea importante mencionar?', placeholder: 'Ej: No incluye comidas...', fullWidth: true, rows: 2 },
    { name: 'childMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 3 años' },
    { name: 'childAdultMustPay', type: 'select', label: '¿El adulto acompañante debe pagar entrada?', options: COMMON_OPTIONS.YES_NO },
    { name: 'childAdultPrice', type: 'text', label: 'De ser así, ¿cuánto debe pagar?', placeholder: 'Ej: $10', showWhen: { field: 'childAdultMustPay', value: 'Sí' } },
    { name: 'childRestrictions', type: 'textarea', label: 'Restricciones:', placeholder: 'Ej: Debe ir acompañado de adulto...', fullWidth: true, rows: 2 },
    { name: 'childRequiresReservation', type: 'select', label: '¿Requiere reservación?', options: COMMON_OPTIONS.YES_NO },
    { name: 'childReservationAdvance', type: 'text', label: 'De responder sí, ¿con cuánto tiempo de anticipación?', placeholder: 'Ej: 24 horas', showWhen: { field: 'childRequiresReservation', value: 'Sí' } },
    { name: 'childCancellationPolicy', type: 'textarea', label: 'Políticas de cancelación (si tiene):', placeholder: 'Descripción de la política...', fullWidth: true, rows: 2 },
  ],
}

// ============================================================
// BIENESTAR Y BELLEZA TEMPLATES
// ============================================================

// Cejas y Pestañas
export const CEJAS_PESTANAS_TEMPLATE: FieldTemplate = {
  displayName: 'Cejas y Pestañas',
  fields: [
    { name: 'eyebrowValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'eyebrowMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 16 años' },
    { name: 'eyebrowResultsDuration', type: 'text', label: 'Duración aproximada de los resultados del procedimiento:', placeholder: 'Ej: 3-4 semanas', fullWidth: true },
    { name: 'eyebrowContraindications', type: 'textarea', label: 'Contraindicaciones (embarazo, queloides, diabetes, dermatitis activa, cejas tatuadas):', placeholder: 'Listar contraindicaciones...', fullWidth: true, rows: 2 },
    { name: 'eyebrowIncludesRetouch', type: 'select', label: '¿Incluye retoque?', options: COMMON_OPTIONS.YES_NO },
    { name: 'eyebrowRetouchDetails', type: 'text', label: 'Si no incluye retoque, ¿cuál es el precio y cuándo se debe realizar?', placeholder: 'Ej: $25, a las 4 semanas', fullWidth: true, showWhen: { field: 'eyebrowIncludesRetouch', value: 'No' } },
    { name: 'eyebrowUsesAnesthesia', type: 'select', label: '¿Se utiliza anestesia tópica local?', options: COMMON_OPTIONS.YES_NO },
    { name: 'eyebrowAftercare', type: 'textarea', label: 'Recomendaciones después del tratamiento:', placeholder: 'Ej: No tomar sol, no tocarse las cejas...', fullWidth: true, rows: 2 },
    { name: 'eyebrowLashType', type: 'select', label: '¿Si son pestañas, son colocadas punto por punto o pelo a pelo?', options: [{ value: 'Punto por punto', label: 'Punto por punto' }, { value: 'Pelo a pelo', label: 'Pelo a pelo' }, { value: 'Ambos', label: 'Ambos' }, { value: 'No aplica', label: 'No aplica' }] },
    { name: 'eyebrowPreviousTattoo', type: 'select', label: '¿Aplica para personas que ya se han tatuado o hecho este tipo de procedimientos en sus cejas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'eyebrowValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// Masajes
export const MASAJES_TEMPLATE: FieldTemplate = {
  displayName: 'Masajes',
  fields: [
    { name: 'massageValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'massageMinAge', type: 'text', label: '¿Desde qué edad?', placeholder: 'Ej: 18 años' },
    { name: 'massagePregnantAllowed', type: 'select', label: '¿Se aplica para embarazadas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'massageCouplesValid', type: 'select', label: '¿Es válido para parejas comprando 2 vouchers (cabina doble)?', options: COMMON_OPTIONS.YES_NO },
    { name: 'massageCouplesExtraCost', type: 'text', label: '¿Algún costo adicional?', placeholder: 'Ej: No, $10 adicional...', showWhen: { field: 'massageCouplesValid', value: 'Sí' } },
    { name: 'massageBodyAreas', type: 'textarea', label: 'Especificar las áreas del cuerpo donde se aplica el masaje:', placeholder: 'Ej: Espalda, piernas, cuello...', fullWidth: true, rows: 2 },
    { name: 'massageDuration', type: 'text', label: 'Duración del masaje en específico (si es paquete, indicar tiempo total también):', placeholder: 'Ej: 60 min masaje, 90 min total', fullWidth: true },
    { name: 'massageValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// Cabello (Tintes/Mechas y Tratamientos)
export const CABELLO_TEMPLATE: FieldTemplate = {
  displayName: 'Tratamientos de Cabello',
  fields: [
    { name: 'hairProductBrand', type: 'text', label: 'Marca de los productos utilizados:', placeholder: 'Ej: L\'Oréal, Wella...' },
    { name: 'hairFantasyColors', type: 'select', label: '¿Aplica colores de fantasía?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairRootRetouch', type: 'select', label: '¿Se aplica para retoque de raíz?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairPregnantAllowed', type: 'select', label: '¿Es válido para embarazadas y mujeres en periodo de lactancia?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairBlackBase', type: 'select', label: '¿Aplica para personas con tinte negro de base?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairCalifornianaBalayage', type: 'select', label: 'En el caso de tinte o mechas, ¿aplica para californianas o balayage?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairResultsDuration', type: 'text', label: '¿Duración de los resultados?', placeholder: 'Ej: 3-4 meses' },
    { name: 'hairIsStraightening', type: 'select', label: '¿Es alisante?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairMinAge', type: 'text', label: '¿Desde qué edad se puede aplicar?', placeholder: 'Ej: 12 años' },
    { name: 'hairValidAllTypes', type: 'select', label: '¿Válido para todo tipo de cabello?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairLengthApplies', type: 'text', label: '¿Para qué largo de cabello aplica? Si no es para todo largo, ¿cuántas onzas se aplican?', placeholder: 'Ej: Todo largo, hasta hombros...', fullWidth: true },
    { name: 'hairIncludesCut', type: 'select', label: 'Si incluye corte, ¿es solo para puntas?', options: [{ value: 'Sí, solo puntas', label: 'Sí, solo puntas' }, { value: 'No, corte completo', label: 'No, corte completo' }, { value: 'No incluye corte', label: 'No incluye corte' }] },
    { name: 'hairContainsFormaldehyde', type: 'select', label: '¿Contiene formol?', options: COMMON_OPTIONS.YES_NO },
    { name: 'hairEffect', type: 'textarea', label: '¿Qué efecto tiene?', placeholder: 'Ej: Alisa, hidrata, reduce volumen...', fullWidth: true, rows: 2 },
    { name: 'hairLeaveInTime', type: 'text', label: '¿Hay que dejar el producto puesto por algún tiempo? ¿Cuánto?', placeholder: 'Ej: 30 minutos, No...', fullWidth: true },
    { name: 'hairAftercare', type: 'textarea', label: '¿Algún cuidado especial luego de aplicar el tratamiento?', placeholder: 'Ej: No lavar por 48 horas...', fullWidth: true, rows: 2 },
    { name: 'hairContraindications', type: 'textarea', label: 'Contraindicaciones:', placeholder: 'Ej: No para embarazadas...', fullWidth: true, rows: 2 },
    { name: 'hairValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
  infoNote: 'Los resultados dependen del tipo de cabello.',
}

// Uñas (Manicure/Pedicure)
export const MANICURE_TEMPLATE: FieldTemplate = {
  displayName: 'Manicure o Pedicure',
  fields: [
    { name: 'nailsDiabeticFoot', type: 'select', label: '¿Válido para pie diabético? (cuando son quiropedias)', options: COMMON_OPTIONS.YES_NO },
    { name: 'nailsPolishIncluded', type: 'select', label: '¿Se coloca pintura?', options: COMMON_OPTIONS.YES_NO },
    { name: 'nailsPolishBrands', type: 'text', label: '¿Qué marcas hay disponibles?', placeholder: 'Ej: OPI, Essie...', showWhen: { field: 'nailsPolishIncluded', value: 'Sí' } },
    { name: 'nailsServiceType', type: 'select', label: 'Especificar si es sencillo (sin eliminar callosidades y cutículas) o completo:', options: [{ value: 'Sencillo', label: 'Sencillo' }, { value: 'Completo', label: 'Completo' }] },
    { name: 'nailsValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'nailsMinAge', type: 'text', label: '¿Desde qué edad?', placeholder: 'Ej: Todas las edades' },
    { name: 'nailsSemiPermRemoval', type: 'select', label: 'Si hay pintura semipermanente, ¿incluye la remoción?', options: COMMON_OPTIONS.YES_NO },
    { name: 'nailsSemiPermRemovalCost', type: 'text', label: 'Si no, ¿cuánto cuesta?', placeholder: 'Ej: $5', showWhen: { field: 'nailsSemiPermRemoval', value: 'No' } },
    { name: 'nailsSemiPermDuration', type: 'text', label: 'Si hay pintura semipermanente o gel, ¿cuánto tiempo dura?', placeholder: 'Ej: 2-3 semanas' },
    { name: 'nailsAppointmentDuration', type: 'text', label: '¿Cuánto tiempo dura la cita?', placeholder: 'Ej: 45 minutos, 1 hora...' },
    { name: 'nailsValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// Facial
export const FACIALES_TEMPLATE: FieldTemplate = {
  displayName: 'Faciales',
  fields: [
    { name: 'facialDescription', type: 'textarea', label: '¿En qué consiste y qué se aplica (cremas, tónicos, vapor, etc.)?', placeholder: 'Descripción del tratamiento...', fullWidth: true, rows: 3 },
    { name: 'facialSpecificTreatments', type: 'textarea', label: 'Si hay tratamientos específicos como mascarillas, serum, ampollas, etc., indicar qué efectos tendrá en la piel:', placeholder: 'Ej: Hidratación profunda, anti-edad...', fullWidth: true, rows: 2 },
    { name: 'facialIncludesExtraction', type: 'select', label: '¿Incluye extracción de puntos negros y blancos?', options: COMMON_OPTIONS.YES_NO },
    { name: 'facialValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'facialMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 18 años' },
    { name: 'facialProductBrands', type: 'text', label: 'Marca de los productos utilizados (cremas o mascarillas):', placeholder: 'Ej: La Roche-Posay, Clarins...', fullWidth: true },
    { name: 'facialContraindications', type: 'textarea', label: 'Contraindicaciones:', placeholder: 'Ej: No para pieles con rosácea activa...', fullWidth: true, rows: 2 },
    { name: 'facialValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// Depilación
export const DEPILACION_TEMPLATE: FieldTemplate = {
  displayName: 'Depilación',
  fields: [
    { name: 'depilationValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'depilationMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 16 años' },
    { name: 'depilationSessionsNeeded', type: 'text', label: '¿Cuántas sesiones se requieren para ver resultados? (permanente)', placeholder: 'Ej: 6-8 sesiones' },
    { name: 'depilationTreatmentType', type: 'select', label: '¿Qué tipo de tratamiento es?', options: [{ value: 'Láser', label: 'Láser' }, { value: 'IPL', label: 'IPL' }, { value: 'Cera', label: 'Cera' }, { value: 'Otro', label: 'Otro' }] },
    { name: 'depilationAppointmentDuration', type: 'text', label: 'Duración de la cita:', placeholder: 'Ej: 30 minutos, 1 hora...' },
    { name: 'depilationBikiniType', type: 'select', label: 'Para cuando colocamos bikini, ¿es línea solamente o completo?', options: [{ value: 'Línea', label: 'Línea' }, { value: 'Completo', label: 'Completo' }, { value: 'No aplica', label: 'No aplica' }] },
    { name: 'depilationIncludesPerianal', type: 'select', label: '¿Incluye área perianal?', options: COMMON_OPTIONS.YES_NO, showWhen: { field: 'depilationBikiniType', value: 'Completo' } },
    { name: 'depilationContraindications', type: 'textarea', label: 'Contraindicaciones:', placeholder: 'Ej: No para pieles bronceadas, embarazadas...', fullWidth: true, rows: 2 },
    { name: 'depilationWaxBrand', type: 'text', label: 'Para depilación no permanente, ¿qué marca de cera se utiliza? ¿Es hipoalergénica?', placeholder: 'Ej: Veet, hipoalergénica', fullWidth: true },
    { name: 'depilationValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// Reductores
export const REDUCTORES_TEMPLATE: FieldTemplate = {
  displayName: 'Paquetes Reductores',
  fields: [
    { name: 'reducerValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'reducerMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 18 años' },
    { name: 'reducerAreasPerPackage', type: 'textarea', label: '¿Áreas a tratar y cuántas áreas se tratan por paquete?', placeholder: 'Ej: Abdomen, flancos - 2 áreas por paquete', fullWidth: true, rows: 2 },
    { name: 'reducerTreatmentsPerVisit', type: 'text', label: '¿Cuántos tratamientos o sesiones se hacen por visita?', placeholder: 'Ej: 2 tratamientos' },
    { name: 'reducerAppointmentDuration', type: 'text', label: '¿Cuál es la duración de cada cita?', placeholder: 'Ej: 1 hora' },
    { name: 'reducerVisitFrequency', type: 'text', label: '¿Cuántas visitas mín y máx se pueden hacer por semana, y cuánto tiempo entre ellas?', placeholder: 'Ej: 1-2 por semana, mínimo 3 días entre citas', fullWidth: true },
    { name: 'reducerContraindications', type: 'textarea', label: 'Contraindicaciones:', placeholder: 'Ej: No para embarazadas, personas con marcapasos...', fullWidth: true, rows: 2 },
    { name: 'reducerPackageStartDeadline', type: 'text', label: '¿Hay un último día de inicio de paquete que sea antes de la fecha de expiración?', placeholder: 'Ej: 30 días antes', fullWidth: true },
    { name: 'reducerValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// Tratamiento para la piel
export const TRATAMIENTO_PIEL_TEMPLATE: FieldTemplate = {
  displayName: 'Tratamientos para la Piel',
  fields: [
    { name: 'skinValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'skinMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 18 años' },
    { name: 'skinExpectedResults', type: 'textarea', label: 'Detallar información sobre los resultados que se obtendrán con el tratamiento:', placeholder: 'Descripción de resultados...', fullWidth: true, rows: 3 },
    { name: 'skinSessionsNeeded', type: 'text', label: 'Cantidad aproximada de sesiones necesarias para ver resultados:', placeholder: 'Ej: 3-5 sesiones' },
    { name: 'skinAftercare', type: 'textarea', label: 'Cuidados después de aplicar el tratamiento:', placeholder: 'Ej: Evitar sol directo...', fullWidth: true, rows: 2 },
    { name: 'skinContraindications', type: 'textarea', label: 'Contraindicaciones:', placeholder: 'Ej: No para embarazadas...', fullWidth: true, rows: 2 },
    { name: 'skinPackageStartDeadline', type: 'text', label: 'Último día de inicio de paquete (si no corresponde a fecha de expiración):', placeholder: 'Ej: 30 días antes', fullWidth: true },
    { name: 'skinValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// ============================================================
// SERVICIOS TEMPLATES
// ============================================================

// Servicio para Autos
export const SERVICIO_AUTOS_TEMPLATE: FieldTemplate = {
  displayName: 'Servicio para Autos',
  fields: [
    { name: 'autoAppliesToVans', type: 'select', label: '¿Aplica para minivans, busitos, taxis?', options: COMMON_OPTIONS.YES_NO },
    { name: 'autoTintBrand', type: 'text', label: 'Para papel ahumado: Marca, tonos disponibles, garantía, % protección UV e IR:', placeholder: 'Descripción completa...', fullWidth: true },
    { name: 'autoHasWaitingRoom', type: 'select', label: '¿Tienen sala de espera?', options: COMMON_OPTIONS.YES_NO },
    { name: 'autoCleaningIncludes', type: 'textarea', label: 'Para limpieza, ¿exactamente qué incluye?', placeholder: 'Ej: Aspirado, lavado exterior, encerado...', fullWidth: true, rows: 2 },
    { name: 'autoInteriorSeatsRemoved', type: 'select', label: 'Para limpieza de interiores, ¿se desmontan los asientos?', options: COMMON_OPTIONS.YES_NO },
    { name: 'autoProductBrands', type: 'text', label: 'Marca de los productos utilizados (cera, etc.):', placeholder: 'Ej: Meguiar\'s, 3M...', fullWidth: true },
    { name: 'autoPolishingMethod', type: 'select', label: 'Si hay opción de pulido o encerado, ¿es a mano o con máquina?', options: [{ value: 'A mano', label: 'A mano' }, { value: 'Con máquina', label: 'Con máquina' }, { value: 'Ambos', label: 'Ambos' }] },
    { name: 'autoExcludedModels', type: 'textarea', label: '¿Algún modelo o marca de auto específico que no aplique?', placeholder: 'Ej: No aplica para Tesla...', fullWidth: true, rows: 2 },
    { name: 'autoAlarmDetails', type: 'textarea', label: 'Para alarmas: ¿tipo, marca, alcance en metros, garantía?', placeholder: 'Ej: Digital, Viper, 500m, 1 año garantía', fullWidth: true, rows: 2 },
    { name: 'autoServiceDuration', type: 'text', label: '¿Cuánto tiempo toma la cita? ¿Hay que dejar el auto?', placeholder: 'Ej: 2 horas, sí hay que dejarlo', fullWidth: true },
    { name: 'autoValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// Alquiler de Autos
export const ALQUILER_AUTOS_TEMPLATE: FieldTemplate = {
  displayName: 'Alquiler de Autos',
  fields: [
    { name: 'rentalDeposit', type: 'text', label: 'Depósito, y método de pago del mismo:', placeholder: 'Ej: $200, tarjeta de crédito', fullWidth: true },
    { name: 'rentalCoveragePlans', type: 'textarea', label: 'Especificar planes de cobertura (qué incluyen y sus precios):', placeholder: 'Descripción de planes...', fullWidth: true, rows: 3 },
    { name: 'rentalMinAge', type: 'text', label: 'Edad mínima:', placeholder: 'Ej: 21 años, 25 años...' },
    { name: 'rentalTransmission', type: 'select', label: '¿El auto es de transmisión automática o manual?', options: [{ value: 'Automática', label: 'Automática' }, { value: 'Manual', label: 'Manual' }, { value: 'Ambas disponibles', label: 'Ambas disponibles' }] },
    { name: 'rentalModelsYears', type: 'textarea', label: 'Modelos y años de los autos:', placeholder: 'Ej: Toyota Corolla 2022, Hyundai Accent 2023...', fullWidth: true, rows: 2 },
    { name: 'rentalMultipleLocations', type: 'select', label: 'De haber varias sucursales, ¿se puede retirar en una y dejarlo en otra?', options: COMMON_OPTIONS.YES_NO },
    { name: 'rentalMultiLocationFee', type: 'text', label: '¿Tiene cargo adicional?', placeholder: 'Ej: $25', showWhen: { field: 'rentalMultipleLocations', value: 'Sí' } },
    { name: 'rentalValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// A/C Autos
export const AC_AUTOS_TEMPLATE: FieldTemplate = {
  displayName: 'Aire Acondicionado - Autos',
  fields: [
    { name: 'acAutoHasWaitingRoom', type: 'select', label: '¿Tiene sala de espera?', options: COMMON_OPTIONS.YES_NO },
    { name: 'acAutoVehicleTypes', type: 'select', label: '¿Aplica para sedán, 4x4, minivan?', options: [{ value: 'Solo sedán', label: 'Solo sedán' }, { value: 'Sedán y 4x4', label: 'Sedán y 4x4' }, { value: 'Todos', label: 'Todos' }] },
    { name: 'acAutoServiceDescription', type: 'textarea', label: 'Descripción de lo que incluye el servicio:', placeholder: 'Ej: Limpieza de filtros, recarga de gas...', fullWidth: true, rows: 2 },
    { name: 'acAutoServiceDuration', type: 'text', label: 'Duración del servicio:', placeholder: 'Ej: 1-2 horas' },
    { name: 'acAutoNonDismantled', type: 'select', label: '¿La limpieza se hace sin desmontar las piezas?', options: COMMON_OPTIONS.YES_NO },
    { name: 'acAutoFilterInfo', type: 'text', label: '¿Aplica para un solo filtro (hay autos que tienen 2)? ¿Cuál?', placeholder: 'Ej: Solo filtro de cabina', fullWidth: true },
    { name: 'acAutoIncludesMaterials', type: 'select', label: '¿Incluye materiales?', options: COMMON_OPTIONS.YES_NO },
    { name: 'acAutoValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// A/C Casas
export const AC_CASAS_TEMPLATE: FieldTemplate = {
  displayName: 'Aire Acondicionado - Casas',
  fields: [
    { name: 'acHomeMaintenanceIncludes', type: 'textarea', label: '¿Qué incluye el mantenimiento?', placeholder: 'Ej: Limpieza de filtros, revisión de gas...', fullWidth: true, rows: 2 },
    { name: 'acHomeIncludesMaterials', type: 'select', label: '¿Incluye materiales o reparaciones?', options: COMMON_OPTIONS.YES_NO },
    { name: 'acHomeMaintenanceType', type: 'select', label: '¿El mantenimiento es preventivo o correctivo?', options: [{ value: 'Preventivo', label: 'Preventivo' }, { value: 'Correctivo', label: 'Correctivo' }, { value: 'Ambos', label: 'Ambos' }] },
    { name: 'acHomeCoverageAreas', type: 'textarea', label: 'Detallar el área de cobertura sin costo adicional, con costo adicional (y precios), y para qué áreas no aplica:', placeholder: 'Ej: Gratis en Ciudad de Panamá, $15 adicional en áreas revertidas...', fullWidth: true, rows: 3 },
    { name: 'acHomeValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// Entrenamiento o Baile
export const ENTRENAMIENTO_TEMPLATE: FieldTemplate = {
  displayName: 'Entrenamiento o Baile',
  fields: [
    { name: 'trainingSchedule', type: 'textarea', label: 'Horario de las clases/entrenamientos:', placeholder: 'Ej: Lunes-Viernes 6AM-9PM...', fullWidth: true, rows: 2 },
    { name: 'trainingCanCombine', type: 'select', label: 'Si hay varios tipos de clase, ¿se pueden combinar?', options: COMMON_OPTIONS.YES_NO },
    { name: 'trainingRegularClientRestriction', type: 'select', label: '¿Hay restricción para clientes regulares?', options: COMMON_OPTIONS.YES_NO },
    { name: 'trainingMembershipIncluded', type: 'select', label: 'Si hay membresía o matrícula, ¿está incluida?', options: [{ value: 'Incluida', label: 'Incluida' }, { value: 'Exonerada solo para voucher', label: 'Exonerada solo para voucher' }, { value: 'No incluida', label: 'No incluida' }] },
    { name: 'trainingValidForGender', type: 'select', label: '¿Es válido para hombres y mujeres?', options: COMMON_OPTIONS.YES_NO },
    { name: 'trainingMinAge', type: 'text', label: '¿Desde qué edad es válido?', placeholder: 'Ej: 16 años' },
    { name: 'trainingMinMaxPeople', type: 'text', label: 'Mínimo y máximo de personas por clase, si aplica:', placeholder: 'Ej: 5 mín, 15 máx' },
    { name: 'trainingPackageStartDeadline', type: 'text', label: '¿Hay un último día de inicio de paquete que sea antes de la fecha de expiración?', placeholder: 'Ej: 15 días antes', fullWidth: true },
    { name: 'trainingValidHolidays', type: 'select', label: '¿Válido en feriados?', options: COMMON_OPTIONS.YES_NO },
  ],
}

// ============================================================
// ALL TEMPLATES EXPORT
// ============================================================
export const FIELD_TEMPLATES: Record<string, FieldTemplate> = {
  EVENTOS: EVENTOS_TEMPLATE,
  OBRAS: OBRAS_TEMPLATE,
  SEMINARIOS: SEMINARIOS_TEMPLATE,
  CURSOS_ACADEMICOS: CURSOS_ACADEMICOS_TEMPLATE,
  CURSO_COCINA: CURSO_COCINA_TEMPLATE,
  HOTEL: HOTEL_TEMPLATE,
  RESTAURANTE: RESTAURANTE_TEMPLATE,
  PRODUCTOS: PRODUCTOS_TEMPLATE,
  MASCOTAS: MASCOTAS_TEMPLATE,
  TOURS: TOURS_TEMPLATE,
  DENTAL: DENTAL_TEMPLATE,
  GIMNASIOS: GIMNASIOS_TEMPLATE,
  LABORATORIO: LABORATORIO_TEMPLATE,
  DONACION: DONACION_TEMPLATE,
  CATERING: CATERING_TEMPLATE,
  FOTOGRAFIA: FOTOGRAFIA_TEMPLATE,
  OPTICAS: OPTICAS_TEMPLATE,
  ALQUILER_VESTIDOS: ALQUILER_VESTIDOS_TEMPLATE,
  RECREACION: RECREACION_TEMPLATE,
  INFANTIL: INFANTIL_TEMPLATE,
  CEJAS_PESTANAS: CEJAS_PESTANAS_TEMPLATE,
  MASAJES: MASAJES_TEMPLATE,
  CABELLO: CABELLO_TEMPLATE,
  MANICURE: MANICURE_TEMPLATE,
  FACIALES: FACIALES_TEMPLATE,
  DEPILACION: DEPILACION_TEMPLATE,
  REDUCTORES: REDUCTORES_TEMPLATE,
  TRATAMIENTO_PIEL: TRATAMIENTO_PIEL_TEMPLATE,
  SERVICIO_AUTOS: SERVICIO_AUTOS_TEMPLATE,
  ALQUILER_AUTOS: ALQUILER_AUTOS_TEMPLATE,
  AC_AUTOS: AC_AUTOS_TEMPLATE,
  AC_CASAS: AC_CASAS_TEMPLATE,
  ENTRENAMIENTO: ENTRENAMIENTO_TEMPLATE,
}
