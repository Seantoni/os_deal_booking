import { getSettings } from './settings';
import { INITIAL_CATEGORY_HIERARCHY, type CategoryHierarchy } from './initial-categories';
import type { CategoryOption, CategoryNode } from '@/types'

export type { CategoryHierarchy }; // Export type for consumers
export { INITIAL_CATEGORY_HIERARCHY }; // Re-export for convenience to avoid breaking existing imports

// Helper to check if a node is a leaf array
function isLeafArray(node: CategoryNode): node is string[] {
  return Array.isArray(node);
}

/**
 * Get hidden category paths from settings
 */
function getHiddenPaths(): Record<string, boolean> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const settings = getSettings();
    return settings.hiddenCategoryPaths || {};
  } catch (e) {
    return {};
  }
}

/**
 * Check if a category path is hidden (including parent paths)
 */
function isPathHidden(pathKey: string, hiddenPaths: Record<string, boolean>): boolean {
  if (hiddenPaths[pathKey]) return true;
  
  // Check if any parent is hidden
  const parts = pathKey.split(':');
  for (let i = 1; i < parts.length; i++) {
    const parentKey = parts.slice(0, i).join(':');
    if (hiddenPaths[parentKey]) return true;
  }
  
  return false;
}

/**
 * Recursively filter hidden paths from a category node
 */
function filterHiddenFromNode(
  node: CategoryNode, 
  parentPath: string, 
  hiddenPaths: Record<string, boolean>
): CategoryNode {
  if (isLeafArray(node)) {
    return node.filter(leaf => {
      const leafPath = `${parentPath}:${leaf}`;
      return !isPathHidden(leafPath, hiddenPaths);
    });
  }
  
  const filtered: { [key: string]: CategoryNode } = {};
  for (const key of Object.keys(node)) {
    const keyPath = `${parentPath}:${key}`;
    if (isPathHidden(keyPath, hiddenPaths)) continue;
    filtered[key] = filterHiddenFromNode(node[key], keyPath, hiddenPaths);
  }
  return filtered;
}

/**
 * Get category hierarchy with hidden categories filtered out
 */
export function getCategoryHierarchy(): CategoryHierarchy {
  if (typeof window === 'undefined') {
    return INITIAL_CATEGORY_HIERARCHY;
  }
  try {
    const settings = getSettings();
    const baseHierarchy = settings.customCategories || INITIAL_CATEGORY_HIERARCHY;
    const hiddenPaths = settings.hiddenCategoryPaths || {};
    
    // If no hidden paths, return as-is
    if (Object.keys(hiddenPaths).length === 0) {
      return baseHierarchy;
    }
    
    // Filter out hidden categories recursively
    const filteredHierarchy: CategoryHierarchy = {};
    
    for (const main in baseHierarchy) {
      if (hiddenPaths[main]) continue;
      filteredHierarchy[main] = filterHiddenFromNode(baseHierarchy[main], main, hiddenPaths);
    }
    
    return filteredHierarchy;
  } catch (e) {
    return INITIAL_CATEGORY_HIERARCHY;
  }
}

/**
 * Get the FULL category hierarchy including hidden categories (for settings page)
 */
export function getFullCategoryHierarchy(): CategoryHierarchy {
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
export const CATEGORY_HIERARCHY = INITIAL_CATEGORY_HIERARCHY; 

export const MAIN_CATEGORIES = Object.keys(INITIAL_CATEGORY_HIERARCHY); 

export function getMainCategories(): string[] {
  return Object.keys(getCategoryHierarchy());
}

/**
 * Recursively collect all leaf category names
 */
function collectLeafCategories(node: CategoryNode, results: string[]): void {
  if (isLeafArray(node)) {
    results.push(...node);
  } else {
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (isLeafArray(child) && child.length === 0) {
        // Empty leaf array means this key is the leaf
        results.push(key);
      } else {
        collectLeafCategories(child, results);
      }
    }
  }
}

/**
 * Helper to get all flat categories for backward compatibility
 */
export function getAllCategories(): string[] {
  const hierarchy = getCategoryHierarchy();
  const all: string[] = [];
  for (const main in hierarchy) {
    collectLeafCategories(hierarchy[main], all);
  }
  return all;
}

export const CATEGORIES = getAllCategories(); // Note: This evaluates once at load time.

// Re-export centralized types
export type { Category, CategoryOption, CategoryColors } from '@/types'

/**
 * Recursively build category options from a node
 */
function buildOptionsFromNode(
  node: CategoryNode,
  parentPath: string[],
  options: CategoryOption[]
): void {
  if (isLeafArray(node)) {
    // Node is a leaf array
    for (const leaf of node) {
      const path = [...parentPath, leaf];
      options.push({
        label: path.join(' > '),
        value: path.join(':'),
        parent: path[0] || '',
        sub1: path[1] || null,
        sub2: path[2] || null,
        sub3: path[3] || null,
        sub4: path[4] || null,
      });
    }
  } else {
    // Node is an object with children
    for (const key of Object.keys(node)) {
      const child = node[key];
      const path = [...parentPath, key];
      
      // If child is an empty object or empty array, this key is a category option
      const isEmpty = isLeafArray(child) ? child.length === 0 : Object.keys(child).length === 0;
      
      if (isEmpty) {
        options.push({
          label: path.join(' > '),
          value: path.join(':'),
          parent: path[0] || '',
          sub1: path[1] || null,
          sub2: path[2] || null,
          sub3: path[3] || null,
          sub4: path[4] || null,
        });
      } else {
        // Recurse into children
        buildOptionsFromNode(child, path, options);
      }
    }
  }
}

export function getCategoryOptions(): CategoryOption[] {
  const hierarchy = getCategoryHierarchy();
  const options: CategoryOption[] = [];
  
  for (const main in hierarchy) {
    const node = hierarchy[main];
    const isEmpty = isLeafArray(node) ? node.length === 0 : Object.keys(node).length === 0;
    
    if (isEmpty) {
      // Main category with no children is itself an option
      options.push({
        label: main,
        value: main,
        parent: main,
        sub1: null,
        sub2: null,
        sub3: null,
        sub4: null,
      });
    } else {
      buildOptionsFromNode(node, [main], options);
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
  return (SEVEN_DAY_CATEGORIES as readonly string[]).includes(mainCategory) ? 7 : 5;
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
