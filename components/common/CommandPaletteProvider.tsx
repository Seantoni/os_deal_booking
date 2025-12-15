'use client'

import dynamic from 'next/dynamic'
import { useCommandPalette } from '@/hooks/useCommandPalette'

// Lazy load CommandPalette - only needed when user presses Cmd+K
const CommandPalette = dynamic(() => import('./CommandPalette'), {
  ssr: false,
})

export default function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const commandPalette = useCommandPalette()

  return (
    <>
      {children}
      {commandPalette.isOpen && (
        <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
      )}
    </>
  )
}

