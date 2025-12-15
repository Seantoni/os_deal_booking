/**
 * Field Comment types for BookingRequest
 * Allows users to add comments/notes to specific fields
 */

export interface FieldCommentEdit {
  text: string
  editedAt: string // ISO date string
}

export interface FieldComment {
  id: string // Unique ID for the comment
  fieldKey: string // Which field the comment is for (e.g., 'accountNumber', 'businessEmail')
  text: string // The comment text
  authorId: string // Clerk user ID
  authorName: string | null // Cached for display
  authorEmail: string | null // Cached for display
  createdAt: string // ISO date string
  updatedAt: string | null // ISO date string if edited
  editHistory: FieldCommentEdit[] // History of edits
}

// Type guard to check if a value is a valid FieldComment array
export function isFieldCommentArray(value: unknown): value is FieldComment[] {
  if (!Array.isArray(value)) return false
  return value.every(item => 
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.fieldKey === 'string' &&
    typeof item.text === 'string' &&
    typeof item.authorId === 'string' &&
    typeof item.createdAt === 'string'
  )
}

// Parse field comments from JSON, with fallback to empty array
export function parseFieldComments(jsonValue: unknown): FieldComment[] {
  if (!jsonValue) return []
  if (isFieldCommentArray(jsonValue)) return jsonValue
  // If it's a string (shouldn't happen with Prisma JSON), try parsing
  if (typeof jsonValue === 'string') {
    try {
      const parsed = JSON.parse(jsonValue)
      if (isFieldCommentArray(parsed)) return parsed
    } catch {
      return []
    }
  }
  return []
}

// Get comments for a specific field
export function getCommentsForField(comments: FieldComment[], fieldKey: string): FieldComment[] {
  return comments.filter(c => c.fieldKey === fieldKey)
}

// Get count of comments per field (for displaying badges)
export function getCommentCountsByField(comments: FieldComment[]): Record<string, number> {
  const counts: Record<string, number> = {}
  comments.forEach(c => {
    counts[c.fieldKey] = (counts[c.fieldKey] || 0) + 1
  })
  return counts
}

