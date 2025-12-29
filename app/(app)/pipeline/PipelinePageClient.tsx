'use client'

import { useState, useMemo } from 'react'
import { Opportunity, BookingRequest } from '@/types'
import SearchIcon from '@mui/icons-material/Search'
import { Input, Button } from '@/components/ui'
import OpportunitiesTable from './OpportunitiesTable'
import RequestsTable from './RequestsTable'
import DealsTable from './DealsTable'
import PreBookedTable from './PreBookedTable'
import UnifiedPipelineTable from './UnifiedPipelineTable'

type PipelineItem = {
  opportunity: Opportunity | null
  bookingRequest: BookingRequest | null
}

type DealItem = {
  deal: {
    id: string
    status: string
    responsibleId: string | null
    bookingRequestId: string
    bookingRequest: BookingRequest
  }
  opportunity: Opportunity | null
  bookingRequest: BookingRequest
}

type PreBookedEventItem = {
  event: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    status: string
    merchant: string | null
    parentCategory: string | null
    subCategory1: string | null
    subCategory2: string | null
    createdAt: Date
  }
}

interface PipelinePageClientProps {
  initialData: {
    opportunities: PipelineItem[]
    deals: DealItem[]
    preBookedEvents?: PreBookedEventItem[]
  }
}

// Tab data for cleaner rendering
const TABS = [
  { id: 0, label: 'Todo (Vista Unificada)' },
  { id: 1, label: 'Oportunidades' },
  { id: 2, label: 'Solicitudes' },
  { id: 3, label: 'Ofertas' },
  { id: 4, label: 'Eventos del Calendario' },
] as const

export default function PipelinePageClient({ initialData }: PipelinePageClientProps) {
  const [tabIndex, setTabIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(50)

  // Reset visible count when tab changes
  const handleTabChange = (id: number) => {
    setTabIndex(id)
    setVisibleCount(50)
  }

  // Calculate counts for tabs
  const opportunitiesCount = initialData.opportunities.filter(i => !i.bookingRequest).length
  const requestsCount = initialData.opportunities.filter(i => i.bookingRequest).length
  const dealsCount = initialData.deals.length
  const eventsCount = initialData.preBookedEvents?.length || 0

  // Get data for current tab
  const currentTabData = useMemo(() => {
    switch (tabIndex) {
      case 1: return initialData.opportunities.filter(i => !i.bookingRequest)
      case 2: return initialData.opportunities.filter(i => i.bookingRequest)
      case 3: return initialData.deals
      case 4: return initialData.preBookedEvents || []
      default: return [] // Unified view handles its own data
    }
  }, [tabIndex, initialData])

  const totalCount = tabIndex === 0 
    ? opportunitiesCount + requestsCount + dealsCount + eventsCount 
    : currentTabData.length

  const getTabLabel = (id: number, baseLabel: string) => {
    switch (id) {
      case 1: return `${baseLabel} (${opportunitiesCount})`
      case 2: return `${baseLabel} (${requestsCount})`
      case 3: return `${baseLabel} (${dealsCount})`
      case 4: return `${baseLabel} (${eventsCount})`
      default: return baseLabel
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="max-w-md w-full">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              size="sm"
              leftIcon={<SearchIcon className="w-4 h-4" />}
            />
          </div>

          {/* Tabs - Pure Tailwind implementation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Pestañas">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    tabIndex === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  aria-current={tabIndex === tab.id ? 'page' : undefined}
                >
                  {getTabLabel(tab.id, tab.label)}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {tabIndex === 0 && (
          <>
            <UnifiedPipelineTable 
              opportunities={initialData.opportunities.slice(0, visibleCount)} 
              deals={initialData.deals.slice(0, Math.max(0, visibleCount - initialData.opportunities.length))}
              preBookedEvents={(initialData.preBookedEvents || []).slice(0, Math.max(0, visibleCount - initialData.opportunities.length - initialData.deals.length))}
              searchQuery={searchQuery} 
            />
            {visibleCount < totalCount && (
              <div className="p-4 border-t border-gray-100 text-center bg-white rounded-b-lg">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 50)}
                >
                  Cargar Más
                </Button>
              </div>
            )}
          </>
        )}
        {tabIndex === 1 && (
          <>
            <OpportunitiesTable data={initialData.opportunities.filter(i => !i.bookingRequest).slice(0, visibleCount)} searchQuery={searchQuery} />
            {visibleCount < opportunitiesCount && (
              <div className="p-4 border-t border-gray-100 text-center bg-white rounded-b-lg">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 50)}
                >
                  Cargar Más
                </Button>
              </div>
            )}
          </>
        )}
        {tabIndex === 2 && (
          <>
            <RequestsTable data={initialData.opportunities.filter(i => i.bookingRequest).slice(0, visibleCount)} searchQuery={searchQuery} />
            {visibleCount < requestsCount && (
              <div className="p-4 border-t border-gray-100 text-center bg-white rounded-b-lg">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 50)}
                >
                  Cargar Más
                </Button>
              </div>
            )}
          </>
        )}
        {tabIndex === 3 && (
          <>
            <DealsTable data={initialData.deals.slice(0, visibleCount)} searchQuery={searchQuery} />
            {visibleCount < dealsCount && (
              <div className="p-4 border-t border-gray-100 text-center bg-white rounded-b-lg">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 50)}
                >
                  Cargar Más
                </Button>
              </div>
            )}
          </>
        )}
        {tabIndex === 4 && (
          <>
            <PreBookedTable data={(initialData.preBookedEvents || []).slice(0, visibleCount)} searchQuery={searchQuery} />
            {visibleCount < eventsCount && (
              <div className="p-4 border-t border-gray-100 text-center bg-white rounded-b-lg">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 50)}
                >
                  Cargar Más
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
