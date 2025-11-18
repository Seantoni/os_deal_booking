export const CATEGORIES = [
  "A/C Carros",
  "A/C Hogar",
  "Actividades al aire libre",
  "Adquier de vestidos",
  "Automóviles",
  "Bern",
  "Cabello",
  "Catering",
  "Cejas y Pestañas",
  "Cirugia capilar",
  "Comunidad OS",
  "Cursos (Idioma, cocina, etc.)",
  "Dental",
  "Depilacion",
  "Ejercicio",
  "Faciales",
  "Fotografía",
  "Hogar",
  "Hotel Bocas",
  "Hotel Boquete",
  "Hotel Ciudad",
  "Hotel de Playa",
  "Hotel Montaña",
  "Hotel Pedasi",
  "Hoteles",
  "Infantiles",
  "Laboratorios",
  "Licencia y clases de Manejo",
  "Mani Pedi",
  "Masajes",
  "Mascotas",
  "Meetings",
  "Obras y Eventos",
  "Opticas",
  "OSP - Aliados",
  "Podología",
  "Recreación y Experiencias",
  "Reductores",
  "Restaurantes y Comidas",
  "Salud/Nutrición",
  "Tratamiento de cabello",
  "Tratamientos para la piel",
  "Yates/Ferrys",
] as const;

export type Category = typeof CATEGORIES[number];

// Categories with 7-day max duration (all others are 5 days)
export const SEVEN_DAY_CATEGORIES = [
  "Restaurantes y Comidas",
  "Catering",
  "Hoteles",
  "Hotel Bocas",
  "Hotel Boquete",
  "Hotel Ciudad",
  "Hotel de Playa",
  "Hotel Montaña",
  "Hotel Pedasi",
  "Obras y Eventos",
] as const;

// Helper function to get max duration for a category
export function getMaxDuration(category: string | null): number {
  if (!category) return 5;
  return SEVEN_DAY_CATEGORIES.includes(category as any) ? 7 : 5;
}

// Helper function to calculate days between dates
export function getDaysDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
  return diffDays;
}

// Color palette for categories
const CATEGORY_COLORS: { [key: string]: { bg: string; text: string; border: string; indicator: string } } = {
  "A/C Carros": { bg: "bg-red-100", text: "text-red-900", border: "border-red-400", indicator: "bg-red-500" },
  "A/C Hogar": { bg: "bg-red-200", text: "text-red-900", border: "border-red-500", indicator: "bg-red-600" },
  "Actividades al aire libre": { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-400", indicator: "bg-emerald-500" },
  "Adquier de vestidos": { bg: "bg-pink-100", text: "text-pink-900", border: "border-pink-400", indicator: "bg-pink-500" },
  "Automóviles": { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-400", indicator: "bg-slate-500" },
  "Bern": { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-400", indicator: "bg-amber-500" },
  "Cabello": { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-400", indicator: "bg-purple-500" },
  "Catering": { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-400", indicator: "bg-orange-500" },
  "Cejas y Pestañas": { bg: "bg-fuchsia-100", text: "text-fuchsia-900", border: "border-fuchsia-400", indicator: "bg-fuchsia-500" },
  "Cirugia capilar": { bg: "bg-violet-100", text: "text-violet-900", border: "border-violet-400", indicator: "bg-violet-500" },
  "Comunidad OS": { bg: "bg-cyan-100", text: "text-cyan-900", border: "border-cyan-400", indicator: "bg-cyan-500" },
  "Cursos (Idioma, cocina, etc.)": { bg: "bg-teal-100", text: "text-teal-900", border: "border-teal-400", indicator: "bg-teal-500" },
  "Dental": { bg: "bg-sky-100", text: "text-sky-900", border: "border-sky-400", indicator: "bg-sky-500" },
  "Depilacion": { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-400", indicator: "bg-rose-500" },
  "Ejercicio": { bg: "bg-lime-100", text: "text-lime-900", border: "border-lime-400", indicator: "bg-lime-500" },
  "Faciales": { bg: "bg-pink-200", text: "text-pink-900", border: "border-pink-500", indicator: "bg-pink-600" },
  "Fotografía": { bg: "bg-indigo-100", text: "text-indigo-900", border: "border-indigo-400", indicator: "bg-indigo-500" },
  "Hogar": { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-400", indicator: "bg-yellow-500" },
  "Hotel Bocas": { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-400", indicator: "bg-blue-500" },
  "Hotel Boquete": { bg: "bg-blue-200", text: "text-blue-900", border: "border-blue-500", indicator: "bg-blue-600" },
  "Hotel Ciudad": { bg: "bg-blue-300", text: "text-blue-900", border: "border-blue-600", indicator: "bg-blue-700" },
  "Hotel de Playa": { bg: "bg-cyan-200", text: "text-cyan-900", border: "border-cyan-500", indicator: "bg-cyan-600" },
  "Hotel Montaña": { bg: "bg-emerald-200", text: "text-emerald-900", border: "border-emerald-500", indicator: "bg-emerald-600" },
  "Hotel Pedasi": { bg: "bg-teal-200", text: "text-teal-900", border: "border-teal-500", indicator: "bg-teal-600" },
  "Hoteles": { bg: "bg-sky-200", text: "text-sky-900", border: "border-sky-500", indicator: "bg-sky-600" },
  "Infantiles": { bg: "bg-pink-300", text: "text-pink-900", border: "border-pink-600", indicator: "bg-pink-700" },
  "Laboratorios": { bg: "bg-slate-200", text: "text-slate-900", border: "border-slate-500", indicator: "bg-slate-600" },
  "Licencia y clases de Manejo": { bg: "bg-amber-200", text: "text-amber-900", border: "border-amber-500", indicator: "bg-amber-600" },
  "Mani Pedi": { bg: "bg-rose-200", text: "text-rose-900", border: "border-rose-500", indicator: "bg-rose-600" },
  "Masajes": { bg: "bg-purple-200", text: "text-purple-900", border: "border-purple-500", indicator: "bg-purple-600" },
  "Mascotas": { bg: "bg-orange-200", text: "text-orange-900", border: "border-orange-500", indicator: "bg-orange-600" },
  "Meetings": { bg: "bg-gray-100", text: "text-gray-900", border: "border-gray-400", indicator: "bg-gray-500" },
  "Obras y Eventos": { bg: "bg-fuchsia-200", text: "text-fuchsia-900", border: "border-fuchsia-500", indicator: "bg-fuchsia-600" },
  "Opticas": { bg: "bg-violet-200", text: "text-violet-900", border: "border-violet-500", indicator: "bg-violet-600" },
  "OSP - Aliados": { bg: "bg-cyan-300", text: "text-cyan-900", border: "border-cyan-600", indicator: "bg-cyan-700" },
  "Podología": { bg: "bg-teal-300", text: "text-teal-900", border: "border-teal-600", indicator: "bg-teal-700" },
  "Recreación y Experiencias": { bg: "bg-lime-200", text: "text-lime-900", border: "border-lime-500", indicator: "bg-lime-600" },
  "Reductores": { bg: "bg-yellow-200", text: "text-yellow-900", border: "border-yellow-500", indicator: "bg-yellow-600" },
  "Restaurantes y Comidas": { bg: "bg-red-300", text: "text-red-900", border: "border-red-600", indicator: "bg-red-700" },
  "Salud/Nutrición": { bg: "bg-emerald-300", text: "text-emerald-900", border: "border-emerald-600", indicator: "bg-emerald-700" },
  "Tratamiento de cabello": { bg: "bg-purple-300", text: "text-purple-900", border: "border-purple-600", indicator: "bg-purple-700" },
  "Tratamientos para la piel": { bg: "bg-rose-300", text: "text-rose-900", border: "border-rose-600", indicator: "bg-rose-700" },
  "Yates/Ferrys": { bg: "bg-sky-300", text: "text-sky-900", border: "border-sky-600", indicator: "bg-sky-700" },
};

// Get colors for a category
export function getCategoryColors(category: string | null) {
  if (!category) return { bg: "bg-gray-100", text: "text-gray-900", border: "border-gray-400", indicator: "bg-gray-500" };
  return CATEGORY_COLORS[category] || { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-400", indicator: "bg-blue-500" };
}

