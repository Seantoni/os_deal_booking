import { prisma } from '@/lib/prisma'
import { formatRequestNameDate } from './date-format'

/**
 * Extract business name from a formatted request name
 * Handles both formats: "Business Name" and "Business Name | Date | #Number"
 * @param name - The request name (formatted or plain)
 * @returns The business name only
 */
export function extractBusinessName(name: string): string {
  // If the name contains " | ", extract only the part before the first " | "
  const parts = name.split(' | ')
  return parts[0].trim()
}

/**
 * Generate a standardized request name in format: "Business Name | Dec-15-2025 | #3"
 * @param businessName - The business name (will be extracted if already formatted)
 * @param existingCount - Count of existing requests for this business (0 for first request)
 * @returns Formatted request name
 */
export function generateRequestName(businessName: string, existingCount: number): string {
  // Extract business name in case a formatted name was passed
  const cleanBusinessName = extractBusinessName(businessName)
  const dateStr = formatRequestNameDate()
  const requestNumber = existingCount + 1
  return `${cleanBusinessName} | ${dateStr} | #${requestNumber}`
}

/**
 * Count existing requests for a business name (for per-business numbering)
 * Matches both old format (just business name) and new format (with date and number)
 * @param businessName - The business name (will be extracted if already formatted)
 */
export async function countBusinessRequests(businessName: string): Promise<number> {
  // Extract business name in case a formatted name was passed
  const cleanBusinessName = extractBusinessName(businessName)
  
  const count = await prisma.bookingRequest.count({
    where: {
      OR: [
        { name: cleanBusinessName },
        { name: { startsWith: `${cleanBusinessName} |` } },
      ],
    },
  })
  return count
}

