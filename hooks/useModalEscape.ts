'use client'

import { useEffect } from 'react'

/**
 * Hook to close a modal when the Escape key is pressed
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Function to call to close the modal
 */
export function useModalEscape(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
}

