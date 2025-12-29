'use client'

/**
 * Re-export shared data hook from consolidated provider
 * This maintains backward compatibility with existing imports
 */
export { useSharedData, clearSharedDataCache } from '@/components/common/AppClientProviders'

// Legacy SharedDataProvider - no longer needed, but kept for type compatibility
// The actual provider is now AppClientProviders in the layout
export function SharedDataProvider({ children }: { children: React.ReactNode }) {
  // This is a no-op wrapper for backward compatibility
  // Actual provider is in AppClientProviders
  return <>{children}</>
}
