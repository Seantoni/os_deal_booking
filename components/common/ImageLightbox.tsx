'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'

interface ImageLightboxProps {
  images: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export default function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)

  // Reset index and zoom when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setZoom(1)
    }
  }, [isOpen, initialIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, images.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    setZoom(1)
  }, [images.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    setZoom(1)
  }, [images.length])

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5))
  }

  if (!isOpen || images.length === 0) return null

  // Ensure currentIndex is valid
  const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1))
  const currentImage = images[safeIndex]

  // Safety check - if no valid image, don't render
  if (!currentImage) return null

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg">
            {safeIndex + 1} / {images.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleZoomOut()
            }}
            className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
            title="Alejar (−)"
          >
            <ZoomOutIcon />
          </button>
          <span className="text-white/80 text-sm font-medium bg-black/40 px-2 py-1.5 rounded-lg min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleZoomIn()
            }}
            className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
            title="Acercar (+)"
          >
            <ZoomInIcon />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-lg transition-colors ml-2"
            title="Cerrar (Esc)"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goToPrevious()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors z-10"
            title="Anterior (←)"
          >
            <ChevronLeftIcon style={{ fontSize: 32 }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goToNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors z-10"
            title="Siguiente (→)"
          >
            <ChevronRightIcon style={{ fontSize: 32 }} />
          </button>
        </>
      )}

      {/* Main Image */}
      <div 
        className="relative max-w-[90vw] max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="transition-transform duration-200"
        >
          <Image
            src={currentImage}
            alt={`Image ${safeIndex + 1}`}
            width={1200}
            height={800}
            className="object-contain max-h-[85vh] w-auto"
            style={{ maxWidth: '90vw' }}
            priority
            unoptimized={currentImage?.startsWith('http') && !currentImage?.includes('amazonaws.com')}
          />
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 p-2 rounded-xl max-w-[90vw] overflow-x-auto">
          {images.filter(Boolean).map((img, idx) => (
            <button
              key={img || idx}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(idx)
                setZoom(1)
              }}
              className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                idx === safeIndex 
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-black/60' 
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                fill
                className="object-cover"
                sizes="56px"
                unoptimized={img?.startsWith('http') && !img?.includes('amazonaws.com')}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

