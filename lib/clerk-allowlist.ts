/**
 * Clerk Allowlist Sync Service
 * Syncs database allowlist with Clerk's allowlist feature
 */

import { clerkClient } from '@clerk/nextjs/server'

// Get the Clerk client instance
async function getClerkClient() {
  return await clerkClient()
}

/**
 * Add an email to Clerk's allowlist
 */
export async function addToClerkAllowlist(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Get Clerk client
    const client = await getClerkClient()

    // Try to create allowlist identifier
    // If it already exists, Clerk will throw an error, which we'll catch
    try {
      await client.allowlistIdentifiers.createAllowlistIdentifier({
        identifier: normalizedEmail,
        notify: false, // Don't send email notification
      })
      return { success: true }
    } catch (createError: any) {
      // If identifier already exists, that's fine - return success
      if (createError?.status === 400 || createError?.message?.includes('already exists') || createError?.message?.includes('duplicate')) {
        return { success: true }
      }
      // Otherwise, re-throw to be caught by outer catch
      throw createError
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[clerk-allowlist] Error adding to allowlist:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Remove an email from Clerk's allowlist
 */
export async function removeFromClerkAllowlist(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Get Clerk client
    const client = await getClerkClient()
    
    // Get all allowlist identifiers and find matching ones
    const list = await client.allowlistIdentifiers.getAllowlistIdentifierList()

    if (!list.data || list.data.length === 0) {
      // No identifiers in allowlist, consider success
      return { success: true }
    }

    // Find identifiers matching the email
    const matchingIdentifiers = list.data.filter(
      (identifier) => identifier.identifier.toLowerCase().trim() === normalizedEmail
    )

    if (matchingIdentifiers.length === 0) {
      // Not in allowlist, consider success
      return { success: true }
    }

    // Delete all matching identifiers (should only be one, but handle multiple)
    for (const identifier of matchingIdentifiers) {
      try {
        await client.allowlistIdentifiers.deleteAllowlistIdentifier(identifier.id)
      } catch (deleteError) {
        console.error('[clerk-allowlist] Error deleting identifier:', deleteError)
        // Continue with other identifiers
      }
    }

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[clerk-allowlist] Error removing from allowlist:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Sync all active emails from database to Clerk allowlist
 * Useful for initial sync or recovery
 */
export async function syncAllToClerkAllowlist(emails: string[]): Promise<{
  success: number
  failed: number
  errors: string[]
}> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const email of emails) {
    const result = await addToClerkAllowlist(email)
    if (result.success) {
      success++
    } else {
      failed++
      errors.push(`${email}: ${result.error || 'Unknown error'}`)
    }
  }

  return { success, failed, errors }
}

