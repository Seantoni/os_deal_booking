import { prisma } from '@/lib/prisma'

const PARENT_CATEGORY_ALIASES: Record<string, string> = {
  HOTELES: 'HOTEL',
}

function normalizeParentCategory(parentCategory: string): string {
  const trimmed = parentCategory.trim()
  const upper = trimmed.toUpperCase()
  return PARENT_CATEGORY_ALIASES[upper] || trimmed
}

async function findActiveCategoryIdByParent(parentCategory: string): Promise<string | null> {
  const matchingCategory = await prisma.category.findFirst({
    where: {
      parentCategory: { equals: parentCategory, mode: 'insensitive' },
      isActive: true,
    },
    select: { id: true },
    orderBy: { displayOrder: 'asc' },
  })

  return matchingCategory?.id || null
}

/**
 * Helper to resolve categoryId - handles both category IDs and parent category strings
 * When displayMode="parentOnly" is used in CategorySelect, it returns parent strings like "Restaurantes"
 * instead of category IDs. This function finds the first matching category.
 *
 * @param categoryValue - Either a category ID (cuid) or a parent category string
 * @returns The resolved category ID or null if not found
 */
export async function resolveCategoryId(categoryValue: string | null): Promise<string | null> {
  if (!categoryValue) return null

  const trimmedCategoryValue = categoryValue.trim()
  if (!trimmedCategoryValue) return null

  // CUIDs are typically 25+ characters and don't contain spaces
  // Parent category strings are usually shorter and may contain spaces
  const looksLikeCuid = trimmedCategoryValue.length >= 20 && !trimmedCategoryValue.includes(' ')

  if (looksLikeCuid) {
    // It looks like a category ID - verify it exists
    const category = await prisma.category.findUnique({
      where: { id: trimmedCategoryValue },
      select: { id: true },
    })
    return category?.id || null
  }

  // It's likely a parent category string - find an active matching category.
  // Try direct match first, then a normalized alias (e.g. HOTELES -> HOTEL).
  const directMatchId = await findActiveCategoryIdByParent(trimmedCategoryValue)
  if (directMatchId) return directMatchId

  const normalizedParentCategory = normalizeParentCategory(trimmedCategoryValue)
  if (normalizedParentCategory !== trimmedCategoryValue) {
    return findActiveCategoryIdByParent(normalizedParentCategory)
  }

  return null
}
