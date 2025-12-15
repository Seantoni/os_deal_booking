import { PrismaClient } from '@prisma/client'
import { INITIAL_CATEGORY_HIERARCHY } from '../lib/initial-categories'
import { SEVEN_DAY_CATEGORIES } from '../lib/categories'

const prisma = new PrismaClient()

/**
 * Seed the database with categories from INITIAL_CATEGORY_HIERARCHY
 * This script will:
 * 1. Clear existing categories (optional - comment out if you want to keep existing)
 * 2. Insert all categories from the initial hierarchy
 * 3. Set maxDuration based on category type (7 days for HOTELES, RESTAURANTES, SHOWS Y EVENTOS)
 */
async function seedCategories() {
  console.log('🌱 Starting category seeding...')

  // Optional: Clear existing categories
  // Uncomment the next line if you want to reset categories on each seed
  // await prisma.category.deleteMany({})
  // console.log('🗑️  Cleared existing categories')

  let displayOrder = 0
  let insertedCount = 0

  // Iterate through the category hierarchy
  for (const [parentCategory, subCategories] of Object.entries(INITIAL_CATEGORY_HIERARCHY)) {
    // Determine max duration (7 days for specific categories, 5 for others)
    const maxDuration = SEVEN_DAY_CATEGORIES.includes(parentCategory as any) ? 7 : 5

    // If there are no subcategories, create a category entry for just the parent
    if (Object.keys(subCategories).length === 0) {
      const categoryKey = parentCategory
      displayOrder++

      await prisma.category.upsert({
        where: { categoryKey },
        update: {
          parentCategory,
          subCategory1: null,
          subCategory2: null,
          subCategory3: null,
          maxDuration,
          isActive: true,
          displayOrder,
        },
        create: {
          parentCategory,
          subCategory1: null,
          subCategory2: null,
          subCategory3: null,
          categoryKey,
          maxDuration,
          isActive: true,
          displayOrder,
        },
      })
      insertedCount++
      console.log(`✅ Created: ${categoryKey}`)
    } else {
      // Iterate through subcategories
      for (const [subCategory1, subCategory2Array] of Object.entries(subCategories)) {
        if (subCategory2Array.length === 0) {
          // No subcategory2 items, create entry for parent:sub1
          const categoryKey = `${parentCategory}:${subCategory1}`
          displayOrder++

          await prisma.category.upsert({
            where: { categoryKey },
            update: {
              parentCategory,
              subCategory1,
              subCategory2: null,
              subCategory3: null,
              maxDuration,
              isActive: true,
              displayOrder,
            },
            create: {
              parentCategory,
              subCategory1,
              subCategory2: null,
              subCategory3: null,
              categoryKey,
              maxDuration,
              isActive: true,
              displayOrder,
            },
          })
          insertedCount++
          console.log(`✅ Created: ${categoryKey}`)
        } else {
          // Has subcategory2 items, create entry for each
          for (const subCategory2 of subCategory2Array) {
            const categoryKey = `${parentCategory}:${subCategory1}:${subCategory2}`
            displayOrder++

            await prisma.category.upsert({
              where: { categoryKey },
              update: {
                parentCategory,
                subCategory1,
                subCategory2,
                subCategory3: null,
                maxDuration,
                isActive: true,
                displayOrder,
              },
              create: {
                parentCategory,
                subCategory1,
                subCategory2,
                subCategory3: null,
                categoryKey,
                maxDuration,
                isActive: true,
                displayOrder,
              },
            })
            insertedCount++
            console.log(`✅ Created: ${categoryKey}`)
          }
        }
      }
    }
  }

  console.log(`\n✨ Seeding complete! Inserted/Updated ${insertedCount} categories`)
}

seedCategories()
  .catch((e) => {
    console.error('❌ Error seeding categories:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

