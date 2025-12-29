'use client'

/**
 * Re-export sidebar context from consolidated provider
 * This maintains backward compatibility with existing imports
 * @deprecated Use imports from '@/components/common/AppClientProviders' instead
 */
export { SidebarContext, useSidebar } from './AppClientProviders'

// Legacy SidebarProvider - no longer needed, context is provided by layout
// Kept for backward compatibility
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // This is a no-op wrapper for backward compatibility
  // Actual provider is AppClientProviders in the layout
  return <>{children}</>
}
