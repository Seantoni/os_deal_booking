'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError, ServerActionResponse } from '@/lib/utils/server-actions'
import type { Category as PrismaCategory } from '.prisma/client'
import type { CategoryHierarchy, CategoryNode } from '@/types'
import { SEVEN_DAY_CATEGORIES } from '@/lib/categories'
import { CACHE_REVALIDATE_CATEGORIES_SECONDS } from '@/lib/constants'
import { logger } from '@/lib/logger'

// Use Prisma's generated Category type
type Category = PrismaCategory

// Helper to check if a node is a leaf array
function isLeafArray(node: CategoryNode): node is string[] {
  return Array.isArray(node)
}

/**
 * Get all active categories from the database (cached)
 * Public function - no auth required
 */
export async function getCategories(): Promise<ServerActionResponse<Category[]>> {
  try {
    const getCachedCategories = unstable_cache(
      async () => {
        return await prisma.category.findMany({
          where: { isActive: true },
          orderBy: [
            { parentCategory: 'asc' },
            { displayOrder: 'asc' },
            { subCategory1: 'asc' },
            { subCategory2: 'asc' },
            { subCategory3: 'asc' },
            { subCategory4: 'asc' },
          ],
        })
      },
      ['categories-active'],
      {
        tags: ['categories'],
        revalidate: CACHE_REVALIDATE_CATEGORIES_SECONDS,
      }
    )

    const categories = await getCachedCategories()
    return { success: true, data: categories }
  } catch (error) {
    logger.error('Error in getCategories:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories'
    }
  }
}

/**
 * Get all categories (including inactive) - requires authentication
 */
export async function getAllCategoriesAdmin(): Promise<ServerActionResponse<Category[]>> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: [
        { parentCategory: 'asc' },
        { displayOrder: 'asc' },
        { subCategory1: 'asc' },
        { subCategory2: 'asc' },
        { subCategory3: 'asc' },
        { subCategory4: 'asc' },
      ],
    })

    return { success: true, data: categories }
  } catch (error) {
    return handleServerActionError(error, 'getAllCategoriesAdmin')
  }
}

/**
 * Get categories by parent category
 */
export async function getCategoriesByParent(
  parentCategory: string
): Promise<ServerActionResponse<Category[]>> {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentCategory,
        isActive: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { subCategory1: 'asc' },
        { subCategory2: 'asc' },
        { subCategory3: 'asc' },
        { subCategory4: 'asc' },
      ],
    })

    return { success: true, data: categories }
  } catch (error) {
    return handleServerActionError(error, 'getCategoriesByParent')
  }
}

/**
 * Get category by category key
 */
export async function getCategoryByKey(
  categoryKey: string
): Promise<ServerActionResponse<Category | null>> {
  try {
    const category = await prisma.category.findUnique({
      where: { categoryKey },
    })

    return { success: true, data: category }
  } catch (error) {
    return handleServerActionError(error, 'getCategoryByKey')
  }
}

/**
 * Get max duration for a parent category
 */
export async function getMaxDurationForCategory(
  parentCategory: string | null
): Promise<ServerActionResponse<number>> {
  if (!parentCategory) {
    return { success: true, data: 5 } // Default
  }

  try {
    const category = await prisma.category.findFirst({
      where: {
        parentCategory,
        isActive: true,
      },
      select: { maxDuration: true },
    })

    return { success: true, data: category?.maxDuration || 5 }
  } catch (error) {
    return handleServerActionError(error, 'getMaxDurationForCategory')
  }
}

/**
 * Sync categories from CategoryHierarchy to database
 * This function will:
 * 1. Get all existing categories from DB
 * 2. Build category keys from the hierarchy (supports up to 5 levels)
 * 3. Upsert all categories (create new, update existing)
 * 4. Mark categories not in hierarchy as inactive
 * 
 * @param hierarchy - The category hierarchy from settings
 */
export async function syncCategoriesToDatabase(
  hierarchy: CategoryHierarchy
): Promise<ServerActionResponse<{ created: number; updated: number; deactivated: number }>> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Get all existing categories
    const existingCategories = await prisma.category.findMany()
    const existingKeys = new Set(existingCategories.map(c => c.categoryKey))

    // Build category keys from hierarchy
    const hierarchyKeys = new Set<string>()
    const categoriesToUpsert: Array<{
      parentCategory: string
      subCategory1: string | null
      subCategory2: string | null
      subCategory3: string | null
      subCategory4: string | null
      categoryKey: string
      maxDuration: number
      displayOrder: number
    }> = []

    let displayOrder = 0

    // Recursive function to traverse the hierarchy
    function traverseNode(
      node: CategoryNode,
      path: string[],
      parentCategory: string,
      maxDuration: number
    ) {
      if (isLeafArray(node)) {
        // Node is a leaf array - each item is a final category
        for (const item of node) {
          const fullPath = [...path, item]
          const categoryKey = fullPath.join(':')
          hierarchyKeys.add(categoryKey)
          displayOrder++

          categoriesToUpsert.push({
            parentCategory,
            subCategory1: fullPath[1] || null,
            subCategory2: fullPath[2] || null,
            subCategory3: fullPath[3] || null,
            subCategory4: fullPath[4] || null,
            categoryKey,
            maxDuration,
            displayOrder,
          })
        }
      } else {
        // Node is an object - each key is a subcategory
        for (const [key, childNode] of Object.entries(node)) {
          const fullPath = [...path, key]
          const childIsEmpty = isLeafArray(childNode) 
            ? childNode.length === 0 
            : Object.keys(childNode).length === 0

          if (childIsEmpty) {
            // Empty node means this key is a leaf category
            const categoryKey = fullPath.join(':')
            hierarchyKeys.add(categoryKey)
            displayOrder++

            categoriesToUpsert.push({
              parentCategory,
              subCategory1: fullPath[1] || null,
              subCategory2: fullPath[2] || null,
              subCategory3: fullPath[3] || null,
              subCategory4: fullPath[4] || null,
              categoryKey,
              maxDuration,
              displayOrder,
            })
          } else {
            // Has children - recurse
            traverseNode(childNode, fullPath, parentCategory, maxDuration)
          }
        }
      }
    }

    // Iterate through the category hierarchy
    for (const [parentCategory, node] of Object.entries(hierarchy)) {
      // Determine max duration (7 days for specific categories, 5 for others)
      const maxDuration = (SEVEN_DAY_CATEGORIES as readonly string[]).includes(parentCategory) ? 7 : 5

      // Check if the main category has no children
      const nodeIsEmpty = isLeafArray(node) 
        ? node.length === 0 
        : Object.keys(node).length === 0

      if (nodeIsEmpty) {
        // No subcategories, create a category entry for just the parent
        const categoryKey = parentCategory
        hierarchyKeys.add(categoryKey)
        displayOrder++

        categoriesToUpsert.push({
          parentCategory,
          subCategory1: null,
          subCategory2: null,
          subCategory3: null,
          subCategory4: null,
          categoryKey,
          maxDuration,
          displayOrder,
        })
      } else {
        // Traverse the node recursively
        traverseNode(node, [parentCategory], parentCategory, maxDuration)
      }
    }

    // Upsert all categories
    let created = 0
    let updated = 0

    for (const category of categoriesToUpsert) {
      const existing = existingKeys.has(category.categoryKey)
      
      await prisma.category.upsert({
        where: { categoryKey: category.categoryKey },
        update: {
          parentCategory: category.parentCategory,
          subCategory1: category.subCategory1,
          subCategory2: category.subCategory2,
          subCategory3: category.subCategory3,
          subCategory4: category.subCategory4,
          maxDuration: category.maxDuration,
          isActive: true, // Reactivate if it was deactivated
          displayOrder: category.displayOrder,
        },
        create: category,
      })

      if (existing) {
        updated++
      } else {
        created++
      }
    }

    // Mark categories not in hierarchy as inactive
    const keysToDeactivate = existingCategories
      .filter(c => !hierarchyKeys.has(c.categoryKey) && c.isActive)
      .map(c => c.categoryKey)

    let deactivated = 0
    if (keysToDeactivate.length > 0) {
      const result = await prisma.category.updateMany({
        where: {
          categoryKey: { in: keysToDeactivate },
        },
        data: {
          isActive: false,
        },
      })
      deactivated = result.count
    }

    return {
      success: true,
      data: {
        created,
        updated,
        deactivated,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'syncCategoriesToDatabase')
  }
}

