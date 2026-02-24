import { prisma } from '@/lib/prisma'

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

  // CUIDs are typically 25+ characters and don't contain spaces
  // Parent category strings are usually shorter and may contain spaces
  const looksLikeCuid = categoryValue.length >= 20 && !categoryValue.includes(' ')

  if (looksLikeCuid) {
    // It looks like a category ID - verify it exists
    const category = await prisma.category.findUnique({
      where: { id: categoryValue },
      select: { id: true },
    })
    return category?.id || null
  }

  // It's likely a parent category string - find any matching category
  const matchingCategory = await prisma.category.findFirst({
    where: { parentCategory: categoryValue, isActive: true },
    select: { id: true },
    orderBy: { displayOrder: 'asc' },
  })

  return matchingCategory?.id || null
}
