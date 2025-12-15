import { prisma } from '@/lib/prisma'
import { formatRequestNameDate } from './date-format'

/**
 * Generate a standardized request name in format: "Business Name | Dec-15-2025 | #3"
 * @param businessName - The business name
 * @param existingCount - Count of existing requests for this business (0 for first request)
 * @returns Formatted request name
 */
export function generateRequestName(businessName: string, existingCount: number): string {
  const dateStr = formatRequestNameDate()
  const requestNumber = existingCount + 1
  return `${businessName} | ${dateStr} | #${requestNumber}`
}

/**
 * Count existing requests for a business name (for per-business numbering)
 * Matches both old format (just business name) and new format (with date and number)
 */
export async function countBusinessRequests(businessName: string): Promise<number> {
  const count = await prisma.bookingRequest.count({
    where: {
      OR: [
        { name: businessName },
        { name: { startsWith: `${businessName} |` } },
      ],
    },
  })
  return count
}

