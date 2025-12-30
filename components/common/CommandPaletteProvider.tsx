'use client'

import dynamic from 'next/dynamic'
import { CommandPaletteProvider as Provider, useCommandPalette } from '@/hooks/useCommandPalette'

// Lazy load CommandPalette - only needed when user presses Cmd+K
const CommandPalette = dynamic(() => import('./CommandPalette'), {
  ssr: false,
})

// Inner component that uses the context
function CommandPaletteRenderer() {
  const commandPalette = useCommandPalette()

  if (!commandPalette.isOpen) return null

  return (
    <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
  )
}

// Main provider that wraps the app
export default function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      {children}
      <CommandPaletteRenderer />
    </Provider>
  )
}

