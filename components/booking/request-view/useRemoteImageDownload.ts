'use client'

import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { getImageExtension, sanitizeFilenamePart } from './bookingRequestView.utils'

export function useRemoteImageDownload() {
  return useCallback(async (url: string, fallbackName: string) => {
    if (!url) return

    try {
      const response = await fetch(`/api/download/image?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Image download failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const extension = getImageExtension(url, blob.type)
      const safeName = sanitizeFilenamePart(fallbackName) || 'booking-image'
      const filename = safeName.toLowerCase().endsWith(`.${extension}`)
        ? safeName
        : `${safeName}.${extension}`

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.error('No se pudo descargar desde el servidor. Se abrió la imagen en una pestaña nueva.')
    }
  }, [])
}
