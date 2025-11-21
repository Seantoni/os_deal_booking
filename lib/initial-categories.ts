import type { CategoryHierarchy } from '@/types/category'

export type { CategoryHierarchy }

export const INITIAL_CATEGORY_HIERARCHY: CategoryHierarchy = {
  "HOTELES": {
    "Hotel de Playa": ["Todo Incluido", "Pasadía", "Villas Privadas"],
    "Hotel Montaña (Boquete)": ["Pasadía", "Coffee Tour"],
    "Hotel Ciudad": ["Pasadía", "Salas de Meetings"],
    "Hotel Bocas del Toro": ["Pasadía", "Overwater Bungalows"],
    "Hotel Pedasí": ["Pasadía", "Surf Camp"]
  },
  "RESTAURANTES": {
    "Comida Rápida": ["Hamburguesas / Pizza"],
    "Comida Local": ["Ceviche / Sancocho"],
    "Internacional": ["Italiana / Sushi"],
    "Mariscos": ["Langosta / Pescado Frito"],
    "Brunch & Buffets": ["Brunch Dominical", "Buffet Libre Internacional", "Buffet Temático"],
    "Postres": ["Helados Artesanales / Tres Leches"]
  },
  "SHOWS Y EVENTOS": {
    "Conciertos": ["Reggaeton / Rock / Salsa"],
    "Teatro": ["Comedia / Musicales"],
    "Festivales": ["Carnaval / Food & Wine"],
    "Eventos Privados": ["Bodas / Cumpleaños"]
  },
  "SERVICIOS": {
    "Automóviles": ["A/C Carros / Clases de Manejo"],
    "Hogar": ["A/C Hogar / Plomería"],
    "Fotografía": ["Bodas / Drone"],
    "Catering": ["Buffet Completo / Coffee Break"]
  },
  "BIENESTAR Y BELLEZA": {
    "Facial": ["Limpieza Profunda / Anti-Edad"],
    "Reductores": ["Cavitación / Maderoterapia"],
    "Cabello": ["Keratina / Botox Capilar / Trasplante"],
    "Uñas": ["Manicure Spa / Acrílico-Gel"],
    "Depilación": ["Láser Definitivo"],
    "Cejas y Pestañas": ["Lifting / Extensiones"],
    "Masajes": ["Relajante / Piedras Calientes"]
  },
  "ACTIVIDADES": {
    "Al Aire Libre": ["Surf / Buceo / Canopy"],
    "Recreación": ["Avistamiento de Ballenas"],
    "Yates": ["Alquiler / Sunset Cruise"],
    "Infantiles": ["Cumpleaños Temáticos"]
  },
  "CURSOS": {
    "Idiomas": ["Inglés / Francés"],
    "Cocina": ["Panameña / Repostería"],
    "Otros": ["Fotografía / Maquillaje / Danza"]
  },
  "PRODUCTOS": {
    "Hogar": ["A/C / Electrodomésticos"],
    "Belleza": ["Cuidado Capilar / Piel"],
    "Salud": ["Vitaminas / Proteína"]
  },
  "LABORATORIOS Y SALUD CLÍNICA": {
    "Análisis": ["Hematología / Perfil Lipídico"],
    "Especializadas": ["Marcadores Tumorales / Paternidad"],
    "Imágenes": ["Ultrasonido / Mamografía"],
    "Domicilio": ["Toma de Muestras en Casa"]
  },
  "MASCOTAS": {
    "Veterinaria": ["Consulta / Vacunas / Esterilización"],
    "Grooming": ["Baño y Corte / Spa"],
    "Productos": ["Alimento Premium"]
  },
  "SPA & DAY SPA": {
    "Día Completo de Spa": [],
    "Spa de Pareja": [],
    "Circuito Hidrotermal + Masaje": [],
    "Día de Belleza": []
  },
  "TURISMO & TOURS": {
    "San Blas Full Day": [],
    "Canal de Panamá + Casco Viejo": [],
    "El Valle de Antón": [],
    "Portobelo + Isla Mamey": [],
    "Gamboa Rainforest": [],
    "City Tour + Compras": []
  },
  "DENTAL & ESTÉTICA DENTAL": {
    "Blanqueamiento LED": [],
    "Carillas de Resina": [],
    "Limpieza + Profilaxis": [],
    "Diseño de Sonrisa": []
  },
  "MÉDICO ESTÉTICO": {
    "Botox": [],
    "Ácido Hialurónico": [],
    "Hilos Tensores": [],
    "PRP Facial": [],
    "Peeling Químico": []
  },
  "GIMNASIOS & FITNESS": {
    "Membresía Mensual Ilimitada": [],
    "Entrenador Personal": [],
    "Clases Grupales": [],
    "Pilates": [],
    "Yoga": [],
    "Reto Transformación": []
  }
};

// Helper to flatten the initial hierarchy (needed for default settings calculation)
export function getInitialFlatCategories(): string[] {
  const all: string[] = [];
  for (const main in INITIAL_CATEGORY_HIERARCHY) {
    for (const sub in INITIAL_CATEGORY_HIERARCHY[main]) {
      const leaves = INITIAL_CATEGORY_HIERARCHY[main][sub];
      if (leaves.length > 0) {
        all.push(...leaves);
      } else {
        all.push(sub);
      }
    }
  }
  return all;
}

