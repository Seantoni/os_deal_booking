'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import LinkIcon from '@mui/icons-material/Link'
import { getBusinessesForPromoterSelect } from '@/app/actions/event-leads'
import { updateRestaurantLeadMatch } from '@/app/actions/restaurant-leads'
import toast from 'react-hot-toast'

interface RestaurantBusinessSelectProps {
  restaurantId: string
  matchedBusinessId: string | null
  matchedBusinessName: string | null
  matchConfidence: number | null
  onSuccess?: () => void
}

const DROPDOWN_HEIGHT = 280

export function RestaurantBusinessSelect({
  restaurantId,
  matchedBusinessId,
  matchedBusinessName,
  matchConfidence,
  onSuccess,
}: RestaurantBusinessSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openAbove: false })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Calculate dropdown position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    
    const openAbove = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow
    
    setDropdownPosition({
      top: openAbove ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
      openAbove,
    })
  }, [])

  // Fetch businesses when dropdown opens or search changes
  useEffect(() => {
    if (!isOpen) return

    async function fetchBusinesses() {
      setLoading(true)
      const result = await getBusinessesForPromoterSelect(searchQuery, 50)
      if (result.success && result.data) {
        setBusinesses(result.data)
      }
      setLoading(false)
    }

    const debounce = setTimeout(fetchBusinesses, searchQuery ? 200 : 0)
    return () => clearTimeout(debounce)
  }, [isOpen, searchQuery])

  // Update position on open and handle scroll/resize
  useEffect(() => {
    if (!isOpen) return

    updatePosition()
    setTimeout(() => searchInputRef.current?.focus(), 0)

    const handleScroll = () => updatePosition()
    const handleResize = () => updatePosition()
    
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, updatePosition])

  // Close on click outside and Escape key
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = async (business: { id: string; name: string }) => {
    setIsOpen(false)
    setSearchQuery('')
    setUpdating(true)
    
    const result = await updateRestaurantLeadMatch(restaurantId, business.id)
    setUpdating(false)

    if (result.success) {
      toast.success('Negocio vinculado')
      onSuccess?.()
    } else {
      toast.error(result.error || 'Error al vincular')
    }
  }

  const handleClear = async () => {
    setIsOpen(false)
    setSearchQuery('')
    setUpdating(true)
    
    const result = await updateRestaurantLeadMatch(restaurantId, null)
    setUpdating(false)

    if (result.success) {
      toast.success('Vínculo eliminado')
      onSuccess?.()
    } else {
      toast.error(result.error || 'Error al actualizar')
    }
  }

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false)
      setSearchQuery('')
    } else {
      setIsOpen(true)
    }
  }

  const confidencePercent = matchConfidence ? Math.round(matchConfidence * 100) : null

  const dropdownContent = isOpen && typeof window !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col"
      style={{
        top: dropdownPosition.openAbove ? 'auto' : dropdownPosition.top,
        bottom: dropdownPosition.openAbove ? `${window.innerHeight - dropdownPosition.top}px` : 'auto',
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        maxHeight: DROPDOWN_HEIGHT,
      }}
    >
      {/* Search input */}
      <div className="p-2 border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 16 }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar negocio..."
            className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Clear option */}
      {matchedBusinessId && (
        <button
          onClick={handleClear}
          className="w-full text-left px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50 border-b border-gray-100 flex items-center gap-2 flex-shrink-0"
        >
          <CloseIcon style={{ fontSize: 14 }} />
          <span>Quitar vínculo</span>
        </button>
      )}

      {/* Business list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-4 text-[13px] text-gray-500 text-center">
            <span className="inline-block animate-pulse">Cargando...</span>
          </div>
        ) : businesses.length === 0 ? (
          <div className="px-3 py-4 text-[13px] text-gray-500 text-center">
            {searchQuery ? 'No se encontraron negocios' : 'Escriba para buscar negocios'}
          </div>
        ) : (
          businesses.map((business) => {
            const isSelected = matchedBusinessId === business.id
            return (
              <button
                key={business.id}
                onClick={() => handleSelect(business)}
                className={`w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 flex items-center justify-between gap-2 transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span className="truncate">{business.name}</span>
                {isSelected && (
                  <CheckIcon className="text-blue-600 flex-shrink-0" style={{ fontSize: 16 }} />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={updating}
        className={`w-full text-left px-1.5 py-0.5 text-[13px] rounded transition-colors flex items-center gap-1 min-w-0 ${
          isOpen 
            ? 'bg-blue-50 text-blue-700' 
            : matchedBusinessName
              ? 'text-green-700 hover:bg-green-50'
              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
        } ${updating ? 'opacity-60 cursor-wait' : ''}`}
        title={matchedBusinessName 
          ? `${matchedBusinessName}${confidencePercent ? ` (${confidencePercent}% match)` : ' (manual)'}`
          : 'Vincular negocio'
        }
      >
        {matchedBusinessName ? (
          <>
            <LinkIcon className="text-green-500 flex-shrink-0" style={{ fontSize: 12 }} />
            <span className="truncate font-medium max-w-[100px]">
              {updating ? 'Guardando...' : matchedBusinessName}
            </span>
            {confidencePercent && (
              <span className="text-[10px] text-gray-400 flex-shrink-0">
                {confidencePercent}%
              </span>
            )}
          </>
        ) : (
          <>
            <span className="truncate">
              {updating ? 'Guardando...' : 'Vincular...'}
            </span>
          </>
        )}
        <KeyboardArrowDownIcon
          className={`flex-shrink-0 transition-transform ml-auto ${isOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}
          style={{ fontSize: 14 }}
        />
      </button>
      {dropdownContent}
    </div>
  )
}
