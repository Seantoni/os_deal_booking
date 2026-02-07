/**
 * External Oferta API Constants
 * Centralized configuration for API endpoints and tokens
 */

// API Endpoints
export const EXTERNAL_DEAL_API_URL = process.env.EXTERNAL_OFERTA_API_URL || 'https://ofertasimple.com/external/api/deals'
export const EXTERNAL_VENDOR_API_URL = process.env.EXTERNAL_OFERTA_VENDOR_API_URL || 'https://ofertasimple.com/external/api/vendors'
export const EXTERNAL_DEAL_METRICS_API_URL = process.env.EXTERNAL_OFERTA_METRICS_API_URL || 'https://ofertasimple.com/external/api/deal-metrics'

// API Token (shared between deal and vendor APIs)
export const EXTERNAL_API_TOKEN = process.env.EXTERNAL_OFERTA_API_TOKEN

// Default section mappings for categories
export const DEFAULT_SECTION_MAPPINGS: Record<string, string> = {
  'HOTELES': 'Hoteles',
  'RESTAURANTES': 'Restaurantes',
  'SHOWS Y EVENTOS': 'Shows y Eventos',
  'SERVICIOS': 'Servicios',
  'BIENESTAR Y BELLEZA': 'Bienestar y Belleza',
  'ACTIVIDADES': 'Actividades',
  'CURSOS': 'Cursos',
  'PRODUCTOS': 'Productos',
  'SPA & DAY SPA': 'Bienestar y Belleza',
  'GIMNASIOS & FITNESS': 'Servicios',
  'MÉDICO ESTÉTICO': 'Bienestar y Belleza',
  'DENTAL & ESTÉTICA DENTAL': 'Bienestar y Belleza',
  'LABORATORIOS Y SALUD CLÍNICA': 'Servicios',
  'TURISMO & TOURS': 'Actividades',
  'MASCOTAS:Veterinaria': 'Servicios',
  'MASCOTAS:Grooming': 'Servicios',
  'MASCOTAS:Productos': 'Productos',
}
