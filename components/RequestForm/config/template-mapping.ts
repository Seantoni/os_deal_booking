/**
 * Template Mapping - Maps categories to field templates
 * 
 * Supports mapping at different levels:
 * - Parent Category only: 'HOTELES' → 'HOTEL'
 * - Parent:SubCategory1: 'CURSOS:Seminarios' → 'SEMINARIOS'
 * - Parent:SubCategory1:SubCategory2: 'SERVICIOS:Automóviles:A/C Carros' → 'AC_AUTOS'
 * 
 * The system will look for the most specific match first, then fall back to less specific.
 */

/**
 * Maps category keys to template names
 * 
 * Key format: 'parentCategory' or 'parentCategory:subCategory1' or 'parentCategory:subCategory1:subCategory2'
 * Value: Template name from FIELD_TEMPLATES
 */
export const CATEGORY_TEMPLATE_MAP: Record<string, string> = {
  // ============================================================
  // PARENT LEVEL MAPPINGS (apply to ALL subcategories)
  // ============================================================
  'HOTELES': 'HOTEL',
  'RESTAURANTES': 'RESTAURANTE',
  'PRODUCTOS': 'PRODUCTOS',
  'MASCOTAS': 'MASCOTAS',
  'TURISMO & TOURS': 'TOURS',
  'DENTAL & ESTÉTICA DENTAL': 'DENTAL',
  'GIMNASIOS & FITNESS': 'GIMNASIOS',
  'COMUNIDAD OS': 'DONACION',
  'LABORATORIOS Y SALUD CLÍNICA': 'LABORATORIO',
  'SPA & DAY SPA': 'MASAJES', // Uses masajes template
  'MÉDICO ESTÉTICO': 'TRATAMIENTO_PIEL', // Uses skin treatment template

  // ============================================================
  // SHOWS Y EVENTOS - by subCategory1
  // ============================================================
  'SHOWS Y EVENTOS:Conciertos': 'EVENTOS',
  'SHOWS Y EVENTOS:Festivales': 'EVENTOS',
  'SHOWS Y EVENTOS:Eventos Privados': 'EVENTOS',
  'SHOWS Y EVENTOS:Teatro': 'OBRAS',

  // ============================================================
  // CURSOS - by subCategory1
  // ============================================================
  'CURSOS:Seminarios': 'SEMINARIOS',
  'CURSOS:Cocina': 'CURSO_COCINA',
  'CURSOS:Idiomas': 'CURSOS_ACADEMICOS',
  'CURSOS:Otros': 'CURSOS_ACADEMICOS',

  // ============================================================
  // SERVICIOS - by subCategory1
  // ============================================================
  'SERVICIOS:Catering': 'CATERING',
  'SERVICIOS:Fotografía': 'FOTOGRAFIA',
  'SERVICIOS:Ópticas': 'OPTICAS',
  'SERVICIOS:Alquiler de vestidos': 'ALQUILER_VESTIDOS',

  // ============================================================
  // SERVICIOS > Automóviles - by subCategory2
  // ============================================================
  'SERVICIOS:Automóviles:A/C Carros': 'AC_AUTOS',
  'SERVICIOS:Automóviles:Lavado de autos': 'SERVICIO_AUTOS',
  'SERVICIOS:Automóviles:Alquiler de autos': 'ALQUILER_AUTOS',

  // ============================================================
  // SERVICIOS > Hogar - by subCategory2
  // ============================================================
  'SERVICIOS:Hogar:A/C Hogar': 'AC_CASAS',
  'SERVICIOS:Hogar:Plomería': 'AC_CASAS', // Fallback template for home services

  // ============================================================
  // ACTIVIDADES - by subCategory1
  // ============================================================
  'ACTIVIDADES:Al Aire Libre': 'RECREACION',
  'ACTIVIDADES:Recreación': 'RECREACION',
  'ACTIVIDADES:Yates': 'RECREACION',
  'ACTIVIDADES:Infantiles': 'INFANTIL',

  // ============================================================
  // BIENESTAR Y BELLEZA - by subCategory1
  // ============================================================
  'BIENESTAR Y BELLEZA:Cejas y Pestañas': 'CEJAS_PESTANAS',
  'BIENESTAR Y BELLEZA:Masajes': 'MASAJES',
  'BIENESTAR Y BELLEZA:Cabello': 'CABELLO',
  'BIENESTAR Y BELLEZA:Uñas': 'MANICURE',
  'BIENESTAR Y BELLEZA:Facial': 'FACIALES',
  'BIENESTAR Y BELLEZA:Depilación': 'DEPILACION',
  'BIENESTAR Y BELLEZA:Reductores': 'REDUCTORES',
  'BIENESTAR Y BELLEZA:Tratamiento para la piel': 'TRATAMIENTO_PIEL',
}

/**
 * Internal helper to try lookups in order of specificity.
 */
function lookupTemplate(keyParts: string[]): string | null {
  if (keyParts.length >= 3) {
    const key3 = keyParts.slice(0, 3).join(':')
    if (CATEGORY_TEMPLATE_MAP[key3]) return CATEGORY_TEMPLATE_MAP[key3]
  }
  if (keyParts.length >= 2) {
    const key2 = keyParts.slice(0, 2).join(':')
    if (CATEGORY_TEMPLATE_MAP[key2]) return CATEGORY_TEMPLATE_MAP[key2]
  }
  if (keyParts.length >= 1) {
    const key1 = keyParts[0]
    if (CATEGORY_TEMPLATE_MAP[key1]) return CATEGORY_TEMPLATE_MAP[key1]
  }
  return null
}

/**
 * Gets the template name for a given category combination.
 * Looks for most specific match first, then falls back.
 * Also supports passing the raw categoryKey (e.g., "HOTELES:Hotel de Playa:Pasadía").
 */
export function getTemplateName(
  parentCategory: string,
  subCategory1?: string,
  subCategory2?: string,
  categoryKey?: string
): string | null {
  // 1) Try explicit args (parent/sub1/sub2)
  const keyParts: string[] = []
  if (parentCategory) keyParts.push(parentCategory)
  if (subCategory1) keyParts.push(subCategory1)
  if (subCategory2) keyParts.push(subCategory2)

  const directMatch = lookupTemplate(keyParts)
  if (directMatch) return directMatch

  // 2) Try categoryKey if provided (e.g., "HOTELES:Hotel de Playa:Pasadía")
  if (categoryKey && categoryKey.includes(':')) {
    const parts = categoryKey.split(':').filter(Boolean)
    const keyMatch = lookupTemplate(parts)
    if (keyMatch) return keyMatch
  }

  // 3) Fallback: try parent only
  if (parentCategory) {
    const parentOnly = lookupTemplate([parentCategory])
    if (parentOnly) return parentOnly
  }

  return null
}

/**
 * Checks if a category combination has a template
 */
export function hasTemplate(
  parentCategory: string,
  subCategory1?: string,
  subCategory2?: string,
  categoryKey?: string
): boolean {
  return getTemplateName(parentCategory, subCategory1, subCategory2, categoryKey) !== null
}
