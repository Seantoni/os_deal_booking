import { ReactNode } from 'react'

/**
 * Standalone layout - no sidebar, no header
 * Used for full-screen preview pages like deal drafts
 */
export default function StandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white overflow-auto">
      {children}
    </div>
  )
}
