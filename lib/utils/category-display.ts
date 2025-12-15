/**
 * Category display formatting utilities
 * Functions for formatting category keys for display
 */

/**
 * Format category key for display
 * Converts "PARENT:SUB1:SUB2" to "PARENT > SUB1 > SUB2"
 */
export function formatCategoryForDisplay(categoryKey: string | null | undefined): string {
  if (!categoryKey) return 'No especificada'
  
  // Replace colons with " > " for display
  return categoryKey.split(':').join(' > ')
}

/**
 * Build category display string from hierarchical fields
 * Returns formatted string like "PARENT > SUB1 > SUB2 > SUB3 > SUB4"
 */
export function buildCategoryDisplayString(
  parentCategory: string | null | undefined,
  subCategory1: string | null | undefined,
  subCategory2: string | null | undefined,
  subCategory3?: string | null | undefined,
  subCategory4?: string | null | undefined,
  fallbackCategory?: string | null
): string {
  if (parentCategory) {
    let display = parentCategory
    if (subCategory1) display += ` > ${subCategory1}`
    if (subCategory2) display += ` > ${subCategory2}`
    if (subCategory3) display += ` > ${subCategory3}`
    if (subCategory4) display += ` > ${subCategory4}`
    return display
  }
  
  return fallbackCategory || 'No especificada'
}

