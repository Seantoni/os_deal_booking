/**
 * Category Fields Configuration
 * 
 * Defines the additional information fields for each category.
 * Add new categories by adding entries to CATEGORY_FIELDS.
 * 
 * Field types: text, textarea, select, number, date, time, checkbox, radio, email, phone, currency
 */

import type { CategoryFieldsConfig } from './field-types'
import { COMMON_OPTIONS } from './field-types'

export const CATEGORY_FIELDS: CategoryFieldsConfig = {
  // ============================================================
  // HOTELES
  // ============================================================
  'HOTELES': {
    displayName: 'Hoteles',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
    infoNote: 'Para Ofertas de 2 noches, colocar que deben ser "consecutivas".',
  },

  // ============================================================
  // RESTAURANTES
  // ============================================================
  'RESTAURANTES': {
    displayName: 'Restaurantes',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // SPA & DAY SPA
  // ============================================================
  'SPA & DAY SPA': {
    displayName: 'Spa & Day Spa',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // BIENESTAR Y BELLEZA
  // ============================================================
  'BIENESTAR Y BELLEZA': {
    displayName: 'Bienestar y Belleza',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // ACTIVIDADES
  // ============================================================
  'ACTIVIDADES': {
    displayName: 'Actividades',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // SHOWS Y EVENTOS
  // ============================================================
  'SHOWS Y EVENTOS': {
    displayName: 'Shows y Eventos',
    fields: [
      {
        name: 'eventStartTime',
        type: 'text',
        label: 'El evento empieza a las:',
        placeholder: 'Ej: 8:00 PM, 9:00 PM...',
      },
      {
        name: 'eventDoorsOpenTime',
        type: 'text',
        label: 'Puertas abren a las:',
        placeholder: 'Ej: 6:00 PM, 7:00 PM...',
      },
      {
        name: 'eventEndTime',
        type: 'text',
        label: 'Termina:',
        placeholder: 'Ej: 11:00 PM, 12:00 AM...',
      },
      {
        name: 'eventMainArtistTime',
        type: 'text',
        label: 'Artista o agrupación principal se presentará a las:',
        placeholder: 'Ej: 9:30 PM, 10:00 PM...',
      },
      {
        name: 'eventTicketPickupStartTime',
        type: 'text',
        label: '¿Desde qué hora se pueden retirar los boletos?',
        placeholder: 'Ej: 4:00 PM, 5:00 PM...',
      },
      {
        name: 'eventTicketPickupEndTime',
        type: 'text',
        label: '¿Hasta qué hora se pueden retirar los boletos?',
        placeholder: 'Ej: 8:00 PM, 9:00 PM...',
      },
      {
        name: 'eventTicketPickupLocation',
        type: 'textarea',
        label: '¿Dónde se retiran los boletos?',
        placeholder: 'Indique la ubicación exacta para retirar los boletos...',
        fullWidth: true,
        rows: 2,
      },
      {
        name: 'eventOpeningArtist',
        type: 'text',
        label: 'Artista o agrupación que abre el evento o concierto:',
        placeholder: 'Nombre del artista de apertura...',
        fullWidth: true,
      },
      {
        name: 'eventOpenBarDetails',
        type: 'textarea',
        label: 'Si hay open bar incluido, ¿qué tipo de bebidas/licores están incluidos?',
        placeholder: 'Ej: Cerveza nacional, Ron, Vodka... o N/A si no aplica',
        fullWidth: true,
        rows: 2,
      },
      {
        name: 'eventMinimumAge',
        type: 'text',
        label: '¿Desde qué edad se permite la entrada al evento?',
        placeholder: 'Ej: 18 años, 21 años, Todas las edades...',
      },
      {
        name: 'eventChildrenPolicy',
        type: 'textarea',
        label: 'Si se permiten niños, especificar: desde qué edad se permiten, hasta qué edad se permite su ingreso gratuito, y desde qué edad se paga boleto',
        placeholder: 'Ej: Niños desde 5 años, gratis hasta 10 años, pagan boleto desde 11 años...',
        fullWidth: true,
        rows: 3,
      },
    ],
    infoNote: 'Para canjear esta oferta debes mostrar el voucher impreso o presentar la versión digital desde tu dispositivo móvil. Se recomienda no doblar el código QR. El email de confirmación de compra no es válido para canjear la oferta. No se aceptan devoluciones ni reembolsos. Prohibida la reventa de vouchers/boletos.',
  },

  // ============================================================
  // SERVICIOS
  // ============================================================
  'SERVICIOS': {
    displayName: 'Servicios',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // CURSOS (Seminarios-specific fields)
  // ============================================================
  'CURSOS': {
    displayName: 'Cursos',
    fields: [
      // ---- Seminarios-specific fields ----
      {
        name: 'courseFormat',
        type: 'select',
        label: '¿Es presencial u online?',
        options: [
          { value: 'Presencial', label: 'Presencial' },
          { value: 'Online', label: 'Online' },
          { value: 'Híbrido', label: 'Híbrido (Presencial y Online)' },
        ],
        showForSubCategories: ['Seminarios'],
      },
      {
        name: 'courseAllowsChildren',
        type: 'select',
        label: '¿Se permiten niños?',
        options: [
          { value: 'Sí', label: 'Sí' },
          { value: 'No', label: 'No' },
        ],
        showForSubCategories: ['Seminarios'],
      },
      {
        name: 'courseChildrenPolicy',
        type: 'textarea',
        label: 'Si se permiten niños, especificar: desde qué edad se permiten, hasta qué edad se permite su ingreso gratuito, y desde qué edad se paga boleto',
        placeholder: 'Ej: Niños desde 10 años, gratis hasta 12 años, pagan desde 13 años...',
        fullWidth: true,
        rows: 2,
        showWhen: { field: 'courseAllowsChildren', value: 'Sí' },
        showForSubCategories: ['Seminarios'],
      },
      {
        name: 'courseLanguage',
        type: 'text',
        label: '¿En qué idioma es el seminario/curso?',
        placeholder: 'Ej: Español, Inglés, Bilingüe...',
        showForSubCategories: ['Seminarios'],
      },
      {
        name: 'courseDuration',
        type: 'text',
        label: '¿Cuál es la duración?',
        placeholder: 'Ej: 2 horas, 1 día, 3 semanas...',
        showForSubCategories: ['Seminarios'],
      },
      {
        name: 'courseIncludesRefreshments',
        type: 'select',
        label: '¿Incluye refrigerio?',
        options: [
          { value: 'Sí', label: 'Sí' },
          { value: 'No', label: 'No' },
        ],
        showForSubCategories: ['Seminarios'],
      },
      {
        name: 'courseIncludesMaterials',
        type: 'select',
        label: '¿Brindarán material escrito?',
        options: [
          { value: 'Sí', label: 'Sí' },
          { value: 'No', label: 'No' },
        ],
        showForSubCategories: ['Seminarios'],
      },
      {
        name: 'courseIncludesCertificate',
        type: 'select',
        label: '¿Incluye certificado de participación?',
        options: [
          { value: 'Sí', label: 'Sí' },
          { value: 'No', label: 'No' },
        ],
        showForSubCategories: ['Seminarios'],
      },
      {
        name: 'courseCertificateFormat',
        type: 'select',
        label: '¿Certificado físico o digital?',
        options: [
          { value: 'Físico', label: 'Físico' },
          { value: 'Digital', label: 'Digital' },
          { value: 'Ambos', label: 'Ambos' },
        ],
        showWhen: { field: 'courseIncludesCertificate', value: 'Sí' },
        showForSubCategories: ['Seminarios'],
      },
    ],
  },

  // ============================================================
  // PRODUCTOS
  // ============================================================
  'PRODUCTOS': {
    displayName: 'Productos',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // LABORATORIOS Y SALUD CLÍNICA
  // ============================================================
  'LABORATORIOS Y SALUD CLÍNICA': {
    displayName: 'Laboratorios y Salud Clínica',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // MASCOTAS
  // ============================================================
  'MASCOTAS': {
    displayName: 'Mascotas',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // TURISMO & TOURS
  // ============================================================
  'TURISMO & TOURS': {
    displayName: 'Turismo & Tours',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // DENTAL & ESTÉTICA DENTAL
  // ============================================================
  'DENTAL & ESTÉTICA DENTAL': {
    displayName: 'Dental & Estética Dental',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // MÉDICO ESTÉTICO
  // ============================================================
  'MÉDICO ESTÉTICO': {
    displayName: 'Médico Estético',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },

  // ============================================================
  // GIMNASIOS & FITNESS
  // ============================================================
  'GIMNASIOS & FITNESS': {
    displayName: 'Gimnasios & Fitness',
    fields: [
      // TODO: Add fields here - user will provide the data
    ],
  },
}

/**
 * Get fields for a specific category
 */
export function getCategoryFields(parentCategory: string) {
  return CATEGORY_FIELDS[parentCategory] || null
}

/**
 * Check if a category has configured fields
 */
export function hasCategoryFields(parentCategory: string): boolean {
  const config = CATEGORY_FIELDS[parentCategory]
  return config !== undefined && config.fields.length > 0
}

/**
 * Get all available category keys
 */
export function getAllCategoryKeys(): string[] {
  return Object.keys(CATEGORY_FIELDS)
}
