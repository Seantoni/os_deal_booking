'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ImageSearchIcon from '@mui/icons-material/ImageSearch'
import WarningIcon from '@mui/icons-material/Warning'
import { Button, Input } from '@/components/ui'
import toast from 'react-hot-toast'

interface ImageResult {
  url: string
  thumbnailUrl: string
  title: string
  sourceUrl: string
  width: number
  height: number
}

interface ImageSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectImages: (urls: string[]) => void
  businessName?: string
  maxSelections?: number
}

export default function ImageSearchModal({
  isOpen,
  onClose,
  onSelectImages,
  businessName = '',
  maxSelections = 10,
}: ImageSearchModalProps) {
  const [query, setQuery] = useState(businessName)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ImageResult[]>([])
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if search is configured
  useEffect(() => {
    async function checkConfig() {
      try {
        const response = await fetch('/api/images/search')
        const data = await response.json()
        setConfigured(data.configured)
      } catch {
        setConfigured(false)
      }
    }
    if (isOpen) {
      checkConfig()
    }
  }, [isOpen])

  // Update query when businessName changes
  useEffect(() => {
    if (businessName && !query) {
      setQuery(businessName)
    }
  }, [businessName, query])

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Ingresa un término de búsqueda')
      return
    }

    setSearching(true)
    setError(null)
    setResults([])

    try {
      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), count: 10 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error al buscar imágenes')
      }

      setResults(data.images || [])
      
      if (data.images?.length === 0) {
        toast('No se encontraron imágenes', { icon: '🔍' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al buscar imágenes'
      setError(message)
      toast.error(message)
    } finally {
      setSearching(false)
    }
  }

  const toggleSelection = (url: string) => {
    const newSelected = new Set(selectedUrls)
    if (newSelected.has(url)) {
      newSelected.delete(url)
    } else {
      if (newSelected.size >= maxSelections) {
        toast.error(`Máximo ${maxSelections} imágenes permitidas`)
        return
      }
      newSelected.add(url)
    }
    setSelectedUrls(newSelected)
  }

  const handleConfirm = () => {
    if (selectedUrls.size === 0) {
      toast.error('Selecciona al menos una imagen')
      return
    }
    onSelectImages(Array.from(selectedUrls))
    setSelectedUrls(new Set())
    setResults([])
    onClose()
  }

  const handleClose = () => {
    setSelectedUrls(new Set())
    setResults([])
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ImageSearchIcon className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Buscar Imágenes</h2>
              <p className="text-sm text-gray-500">Busca imágenes del negocio en Internet</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {configured === false ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-yellow-100 rounded-full mb-4">
                <WarningIcon className="text-yellow-600" style={{ fontSize: 48 }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Búsqueda no configurada
              </h3>
              <p className="text-sm text-gray-500 max-w-md">
                La búsqueda de imágenes requiere configurar Google Custom Search API.
                Contacta al administrador para habilitar esta función.
              </p>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre del negocio, URL o palabras clave..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    leftIcon={<SearchIcon className="text-gray-400" />}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  loading={searching}
                  disabled={!query.trim()}
                >
                  Buscar
                </Button>
              </div>

              {/* Results */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {results.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">
                      {results.length} resultados • {selectedUrls.size} seleccionadas
                    </p>
                    {selectedUrls.size > 0 && (
                      <button
                        onClick={() => setSelectedUrls(new Set())}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {results.map((image, idx) => (
                      <button
                        key={`${image.url}-${idx}`}
                        onClick={() => toggleSelection(image.url)}
                        className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          selectedUrls.has(image.url)
                            ? 'border-purple-500 ring-2 ring-purple-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Image
                          src={image.thumbnailUrl}
                          alt={image.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          unoptimized // External URLs
                        />
                        
                        {/* Selection indicator */}
                        {selectedUrls.has(image.url) && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <CheckCircleIcon className="text-purple-600 bg-white rounded-full" style={{ fontSize: 32 }} />
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                        {/* Size badge */}
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                          {image.width}×{image.height}
                        </div>
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 mt-4 text-center">
                    ⚠️ Las imágenes provienen de Internet. Asegúrate de tener derechos de uso.
                  </p>
                </>
              )}

              {!searching && results.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <ImageSearchIcon className="text-gray-400" style={{ fontSize: 48 }} />
                  </div>
                  <p className="text-sm text-gray-500">
                    Ingresa el nombre del negocio o URL para buscar imágenes
                  </p>
                </div>
              )}

              {searching && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-500">Buscando imágenes...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {configured !== false && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedUrls.size === 0}
            >
              Agregar {selectedUrls.size > 0 ? `(${selectedUrls.size})` : ''} Imágenes
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

