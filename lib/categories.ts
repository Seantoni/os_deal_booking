import { getSettings } from './settings';
import { INITIAL_CATEGORY_HIERARCHY, type CategoryHierarchy } from './initial-categories';

export type { CategoryHierarchy }; // Export type for consumers
export { INITIAL_CATEGORY_HIERARCHY }; // Re-export for convenience to avoid breaking existing imports

// Mutable export that can be updated at runtime (or we use a getter)
// We use a getter pattern to retrieve the hierarchy, preferring settings if available.
// Note: Since getSettings uses localStorage, it only works on client.
// For server-side rendering (SSR), we might need a fallback or consistent default.

export function getCategoryHierarchy(): CategoryHierarchy {
  if (typeof window === 'undefined') {
    return INITIAL_CATEGORY_HIERARCHY;
  }
  try {
    const settings = getSettings();
    return settings.customCategories || INITIAL_CATEGORY_HIERARCHY;
  } catch (e) {
    return INITIAL_CATEGORY_HIERARCHY;
  }
}

// Keep for backward compat if needed, but prefer function.
// NOTE: This is static at load time. If settings change, this object won't update automatically
// unless we use a proxy or force reload. Most components should use getCategoryHierarchy().
// However, to avoid the "before initialization" error, we MUST NOT call getSettings() at the top level
// if getSettings() depends on something else in this file.
// But now getSettings only depends on initial-categories.ts, so it should be fine.
export const CATEGORY_HIERARCHY = INITIAL_CATEGORY_HIERARCHY; 

export const MAIN_CATEGORIES = Object.keys(INITIAL_CATEGORY_HIERARCHY); 

export function getMainCategories(): string[] {
  return Object.keys(getCategoryHierarchy());
}

// Helper to get all flat categories for backward compatibility if needed
// or for validation
export function getAllCategories(): string[] {
  const hierarchy = getCategoryHierarchy();
  const all: string[] = [];
  for (const main in hierarchy) {
    for (const sub in hierarchy[main]) {
      const leaves = hierarchy[main][sub];
      if (leaves.length > 0) {
        all.push(...leaves);
      } else {
        all.push(sub);
      }
    }
  }
  return all;
}

export const CATEGORIES = getAllCategories(); // Note: This evaluates once at load time.

// Re-export centralized types
export type { Category, CategoryOption, CategoryColors } from '@/types/category'

// Import for use in this file
import type { CategoryOption } from '@/types/category'

export function getCategoryOptions(): CategoryOption[] {
  const hierarchy = getCategoryHierarchy();
  const options: CategoryOption[] = [];
  
  for (const main in hierarchy) {
    const subs = hierarchy[main];
    if (Object.keys(subs).length === 0) {
       options.push({
          label: main,
          value: main,
          parent: main,
          sub1: null,
          sub2: null
       });
    }
    
    for (const sub in subs) {
      const leaves = subs[sub];
      if (leaves.length > 0) {
        for (const leaf of leaves) {
          options.push({
            label: `${main} > ${sub} > ${leaf}`,
            value: `${main}:${sub}:${leaf}`,
            parent: main,
            sub1: sub,
            sub2: leaf
          });
        }
      } else {
        options.push({
          label: `${main} > ${sub}`,
          value: `${main}:${sub}`,
          parent: main,
          sub1: sub,
          sub2: null
        });
      }
    }
  }
  return options;
}

// Categories with 7-day max duration
export const SEVEN_DAY_CATEGORIES = [
  "HOTELES",
  "RESTAURANTES",
  "SHOWS Y EVENTOS"
] as const;

export function getMaxDuration(mainCategory: string | null): number {
  if (!mainCategory) return 5;
  // Simple check for now, can be expanded
  return SEVEN_DAY_CATEGORIES.includes(mainCategory as any) ? 7 : 5;
}

export function getDaysDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// Color palette by Main Category
const MAIN_CATEGORY_COLORS: { [key: string]: { bg: string; text: string; border: string; indicator: string } } = {
  "HOTELES": { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-400", indicator: "bg-blue-500" },
  "RESTAURANTES": { bg: "bg-red-100", text: "text-red-900", border: "border-red-400", indicator: "bg-red-500" },
  "SHOWS Y EVENTOS": { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-400", indicator: "bg-purple-500" },
  "SERVICIOS": { bg: "bg-gray-100", text: "text-gray-900", border: "border-gray-400", indicator: "bg-gray-500" },
  "BIENESTAR Y BELLEZA": { bg: "bg-pink-100", text: "text-pink-900", border: "border-pink-400", indicator: "bg-pink-500" },
  "ACTIVIDADES": { bg: "bg-green-100", text: "text-green-900", border: "border-green-400", indicator: "bg-green-500" },
  "CURSOS": { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-400", indicator: "bg-yellow-500" },
  "PRODUCTOS": { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-400", indicator: "bg-orange-500" },
  "LABORATORIOS Y SALUD CLÍNICA": { bg: "bg-teal-100", text: "text-teal-900", border: "border-teal-400", indicator: "bg-teal-500" },
  "MASCOTAS": { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-400", indicator: "bg-amber-500" },
  "SPA & DAY SPA": { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-400", indicator: "bg-rose-500" },
  "TURISMO & TOURS": { bg: "bg-cyan-100", text: "text-cyan-900", border: "border-cyan-400", indicator: "bg-cyan-500" },
  "DENTAL & ESTÉTICA DENTAL": { bg: "bg-sky-100", text: "text-sky-900", border: "border-sky-400", indicator: "bg-sky-500" },
  "MÉDICO ESTÉTICO": { bg: "bg-indigo-100", text: "text-indigo-900", border: "border-indigo-400", indicator: "bg-indigo-500" },
  "GIMNASIOS & FITNESS": { bg: "bg-lime-100", text: "text-lime-900", border: "border-lime-400", indicator: "bg-lime-500" },
};

export function getCategoryColors(mainCategory: string | null) {
  if (!mainCategory) return { bg: "bg-gray-100", text: "text-gray-900", border: "border-gray-400", indicator: "bg-gray-500" };
  return MAIN_CATEGORY_COLORS[mainCategory] || { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-400", indicator: "bg-slate-500" };
}
