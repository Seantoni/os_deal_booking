'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import SearchIcon from '@mui/icons-material/Search'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckIcon from '@mui/icons-material/Check'
import { Alert } from '@/components/ui'

export interface BusinessWithStatus {
  id: string
  name: string
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  categoryId: string | null
  category?: {
    id: string
    categoryKey: string
    parentCategory: string
    subCategory1: string | null
    subCategory2: string | null
  } | null
  website: string | null
  instagram: string | null
  description: string | null
  ruc: string | null
  razonSocial: string | null
  provinceDistrictCorregimiento: string | null
  bank: string | null
  beneficiaryName: string | null
  accountNumber: string | null
  accountType: string | null
  paymentPlan: string | null
  address: string | null
  neighborhood: string | null
  // Booking status
  hasFutureBooking: boolean
  hasActiveRequest: boolean
}

interface BusinessSelectProps {
  value: string
  onChange: (businessName: string, business: BusinessWithStatus | null) => void
  label?: string
  required?: boolean
  error?: string
  disabled?: boolean
  placeholder?: string
  /** Called when a business with active bookings is selected */
  onActiveBookingWarning?: (business: BusinessWithStatus) => void
}

export default function BusinessSelect({
  value,
  onChange,
  label = 'Business',
  required = false,
  error,
  disabled = false,
  placeholder = 'Search and select a business',
  onActiveBookingWarning,
}: BusinessSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [businesses, setBusinesses] = useState<BusinessWithStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithStatus | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch businesses with booking status
  useEffect(() => {
    async function fetchBusinesses() {
      if (businesses.length > 0) return // Already fetched
      
      setLoading(true)
      try {
        const { getBusinessesWithBookingStatus } = await import('@/app/actions/businesses')
        const result = await getBusinessesWithBookingStatus()
        if (result.success && result.data) {
          setBusinesses(result.data)
        }
      } catch (err) {
        console.error('Failed to fetch businesses:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBusinesses()
  }, [businesses.length])

  // Find selected business when value changes
  useEffect(() => {
    if (value && businesses.length > 0) {
      const found = businesses.find(b => b.name === value)
      setSelectedBusiness(found || null)
    } else {
      setSelectedBusiness(null)
    }
  }, [value, businesses])

  // Update dropdown position when open
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filter businesses based on search
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery.trim()) return businesses
    const query = searchQuery.toLowerCase()
    return businesses.filter(b => 
      b.name.toLowerCase().includes(query) ||
      b.contactName?.toLowerCase().includes(query) ||
      b.contactEmail?.toLowerCase().includes(query)
    )
  }, [businesses, searchQuery])

  const handleSelect = (business: BusinessWithStatus) => {
    setSearchQuery('')
    setIsOpen(false)
    onChange(business.name, business)
    
    // Show warning if business has active bookings
    if (business.hasFutureBooking || business.hasActiveRequest) {
      setShowWarning(true)
      onActiveBookingWarning?.(business)
    } else {
      setShowWarning(false)
    }
  }

  const handleClear = () => {
    onChange('', null)
    setSelectedBusiness(null)
    setShowWarning(false)
    setSearchQuery('')
  }

  // Dropdown content rendered via portal
  const dropdownContent = isOpen && typeof window !== 'undefined' ? createPortal(
    <div 
      ref={dropdownRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
    >
      {loading ? (
        <div className="px-4 py-3 text-sm text-gray-500">Cargando negocios...</div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-500">
          {searchQuery ? 'No se encontraron negocios' : 'No hay negocios disponibles'}
        </div>
      ) : (
        filteredBusinesses.map((business) => (
          <div
            key={business.id}
            onClick={() => handleSelect(business)}
            className={`
              px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between gap-2
              ${value === business.name ? 'bg-blue-50' : ''}
            `}
          >
            <span className="text-sm text-gray-900 truncate">{business.name}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
                  {(business.hasFutureBooking || business.hasActiveRequest) && (
                <WarningAmberIcon className="w-3.5 h-3.5 text-amber-500" titleAccess="Tiene reservas activas" />
                  )}
              {value === business.name && (
                <CheckIcon className="w-4 h-4 text-blue-600" />
              )}
            </div>
          </div>
        ))
      )}
    </div>,
    document.body
  ) : null

  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <span className="text-xs font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      
      <div className="relative">
        <div
          ref={triggerRef}
          className={`
            w-full border rounded-lg shadow-sm transition-all duration-200 bg-white
            ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'}
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}
            ${error ? 'border-red-300' : ''}
          `}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="flex items-center px-2.5 py-1.5">
            <SearchIcon className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            {isOpen ? (
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={loading ? 'Cargando...' : placeholder}
                className="flex-1 text-sm outline-none bg-transparent"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`flex-1 text-sm truncate ${value ? 'text-gray-900' : 'text-gray-500'}`}>
                {value || (loading ? 'Cargando...' : placeholder)}
              </span>
            )}
            {value && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <KeyboardArrowDownIcon 
              className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>

        {dropdownContent}
      </div>

      {error && <span className="text-xs text-red-600">{error}</span>}

      {/* Warning banner for active bookings */}
      {showWarning && selectedBusiness && (selectedBusiness.hasFutureBooking || selectedBusiness.hasActiveRequest) && (
        <Alert variant="warning" className="mt-1.5">
          {selectedBusiness.name}: {selectedBusiness.hasFutureBooking && selectedBusiness.hasActiveRequest 
            ? 'tiene eventos y solicitudes activas'
              : selectedBusiness.hasFutureBooking 
              ? 'tiene eventos futuros' 
              : 'tiene solicitudes pendientes'
            }
        </Alert>
      )}
    </div>
  )
}
