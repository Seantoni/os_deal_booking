'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Opportunity, BookingRequest } from '@/types'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { TableRow, TableCell } from '@/components/shared/table'

// Lazy load heavy modal components
const OpportunityFormModal = dynamic(() => import('@/components/crm/opportunity/OpportunityFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})
const BookingRequestViewModal = dynamic(() => import('@/components/booking/request-view/BookingRequestViewModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

// Types match PipelinePageClient
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

interface UnifiedPipelineTableProps {
  opportunities: PipelineItem[]
  deals: DealItem[]
  preBookedEvents: PreBookedEventItem[]
  searchQuery: string
}

// Normalized Row Data Structure
type UnifiedRow = {
  id: string
  title: string
  merchant?: string | null
  createdAt: Date
  phaseStartDate: Date // When the item entered its current phase
  reservedStartDate?: Date
  reservedEndDate?: Date
  
  // Lifecycle Status Flags
  hasOpportunity: boolean
  hasRequest: boolean
  hasDeal: boolean
  hasEvent: boolean // Pre-booked or booked
  
  // Active Status Details
  currentStage: 'Opportunity' | 'Request' | 'Deal' | 'Event'
  statusLabel: string
  
  // Original Data References for Actions
  opportunity?: Opportunity | null
  bookingRequest?: BookingRequest | null
  deal?: DealItem['deal'] | null
  event?: PreBookedEventItem['event'] | null
}

// Helper to calculate days in phase
function calculateDaysInPhase(phaseStartDate: Date): number {
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - phaseStartDate.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export default function UnifiedPipelineTable({ 
  opportunities, 
  deals, 
  preBookedEvents, 
  searchQuery 
}: UnifiedPipelineTableProps) {
  
  // --- Data Normalization Logic ---
  const rows: UnifiedRow[] = []
  const processedIds = new Set<string>()

  // 1. Process Deals (Most complete items)
  deals.forEach(item => {
    const rowId = item.deal.id
    processedIds.add(rowId)
    if (item.opportunity?.id) processedIds.add(item.opportunity.id)
    if (item.bookingRequest?.id) processedIds.add(item.bookingRequest.id)

    // For deals, use processedAt (when it became a deal) or fall back to createdAt
    const dealPhaseStart = item.bookingRequest.processedAt 
      ? new Date(item.bookingRequest.processedAt) 
      : new Date(item.bookingRequest.createdAt || new Date())

    rows.push({
      id: rowId,
      title: item.bookingRequest.name,
      merchant: item.bookingRequest.merchant,
      createdAt: item.bookingRequest.createdAt ? new Date(item.bookingRequest.createdAt) : new Date(),
      phaseStartDate: dealPhaseStart,
      reservedStartDate: item.bookingRequest.startDate ? new Date(item.bookingRequest.startDate) : undefined,
      reservedEndDate: item.bookingRequest.endDate ? new Date(item.bookingRequest.endDate) : undefined,
      hasOpportunity: !!item.opportunity,
      hasRequest: true,
      hasDeal: true,
      hasEvent: true, // Deals imply a booked event exists
      currentStage: 'Deal',
      statusLabel: item.deal.status.replace(/_/g, ' '),
      opportunity: item.opportunity,
      bookingRequest: item.bookingRequest,
      deal: item.deal,
    })
  })

  // 2. Process Opportunities/Requests (that didn't become deals yet)
  opportunities.forEach(item => {
    // Skip if already processed via deal
    if (item.opportunity?.id && processedIds.has(item.opportunity.id)) return
    if (item.bookingRequest?.id && processedIds.has(item.bookingRequest.id)) return

    const title = item.opportunity?.business?.name || item.bookingRequest?.name || 'Unknown'
    const hasRequest = !!item.bookingRequest
    const isBooked = item.bookingRequest?.status === 'booked'
    
    // Determine active stage
    let currentStage: UnifiedRow['currentStage'] = 'Opportunity'
    let statusLabel = item.opportunity?.stage || 'Unknown'

    if (hasRequest) {
      if (item.bookingRequest?.status === 'draft' || item.bookingRequest?.status === 'pending') {
        currentStage = 'Request'
        statusLabel = item.bookingRequest.status
      } else if (item.bookingRequest?.status === 'approved') {
        currentStage = 'Request' // Or 'Booking' intermediate
        statusLabel = 'Approved'
      } else if (item.bookingRequest?.status === 'booked') {
        currentStage = 'Event'
        statusLabel = 'Booked'
      }
    }

    // Determine phase start date based on current stage
    let phaseStartDate: Date
    if (currentStage === 'Request' && item.bookingRequest?.createdAt) {
      phaseStartDate = new Date(item.bookingRequest.createdAt)
    } else if (currentStage === 'Event' && item.bookingRequest?.processedAt) {
      phaseStartDate = new Date(item.bookingRequest.processedAt)
    } else {
      // Opportunity stage - use opportunity createdAt or updatedAt
      phaseStartDate = new Date(item.opportunity?.updatedAt || item.opportunity?.createdAt || item.bookingRequest?.createdAt || new Date())
    }

    rows.push({
      id: item.opportunity?.id || item.bookingRequest?.id || Math.random().toString(),
      title,
      merchant: item.bookingRequest?.merchant,
      createdAt: new Date(item.opportunity?.createdAt || item.bookingRequest?.createdAt || new Date()),
      phaseStartDate,
      reservedStartDate: item.bookingRequest?.startDate ? new Date(item.bookingRequest.startDate) : undefined,
      reservedEndDate: item.bookingRequest?.endDate ? new Date(item.bookingRequest.endDate) : undefined,
      hasOpportunity: !!item.opportunity,
      hasRequest: hasRequest,
      hasDeal: false, // Would have been caught in step 1
      hasEvent: isBooked,
      currentStage,
      statusLabel,
      opportunity: item.opportunity,
      bookingRequest: item.bookingRequest,
    })
  })

  // 3. Process Pre-Booked Events (Admin direct bookings)
  preBookedEvents.forEach(item => {
    const eventCreatedAt = item.event.createdAt ? new Date(item.event.createdAt) : new Date()
    
    rows.push({
      id: item.event.id,
      title: item.event.name,
      merchant: item.event.merchant,
      createdAt: eventCreatedAt,
      phaseStartDate: eventCreatedAt, // Pre-booked events start in Event phase
      reservedStartDate: item.event.startDate ? new Date(item.event.startDate) : undefined,
      reservedEndDate: item.event.endDate ? new Date(item.event.endDate) : undefined,
      hasOpportunity: false,
      hasRequest: false,
      hasDeal: false,
      hasEvent: true,
      currentStage: 'Event',
      statusLabel: 'Pre-Booked',
      event: item.event,
    })
  })

  // --- Filtering ---
  const filteredRows = rows.filter(row => {
    if (!searchQuery) return true
    return row.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (row.merchant && row.merchant.toLowerCase().includes(searchQuery.toLowerCase()))
  }).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })

  // --- Modals State ---
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // --- Helper for Stepper ---
  const Steps = ({ row }: { row: UnifiedRow }) => {
    // Logic to determine step state: 'completed' | 'active' | 'pending'
    const getStepState = (step: 'Opp' | 'Req' | 'Deal' | 'Event') => {
      if (step === 'Opp') {
        if (row.hasOpportunity) return 'completed'
        return 'pending' // Or 'skipped' if it started as a request
      }
      if (step === 'Req') {
        if (row.hasRequest && row.currentStage !== 'Request') return 'completed'
        if (row.currentStage === 'Request') return 'active'
        return 'pending'
      }
      if (step === 'Deal') {
        if (row.hasDeal) return 'active' // Deal is usually the end of this pipeline view or ongoing
        return 'pending'
      }
      if (step === 'Event') {
        if (row.hasEvent) return 'completed'
        return 'pending'
      }
      return 'pending'
    }

    return (
      <div className="flex items-center space-x-1">
        {/* Opportunity Step */}
        <div className={`w-2 h-2 rounded-full ${row.hasOpportunity ? 'bg-blue-500' : 'bg-gray-200'}`} title="Opportunity" />
        <div className="w-4 h-0.5 bg-gray-200" />
        
        {/* Request Step */}
        <div className={`w-2 h-2 rounded-full ${row.hasRequest ? 'bg-yellow-500' : 'bg-gray-200'}`} title="Booking Request" />
        <div className="w-4 h-0.5 bg-gray-200" />

        {/* Event Step */}
        <div className={`w-2 h-2 rounded-full ${row.hasEvent ? 'bg-green-500' : 'bg-gray-200'}`} title="Event Scheduled" />
        <div className="w-4 h-0.5 bg-gray-200" />

        {/* Deal Step */}
        <div className={`w-2 h-2 rounded-full ${row.hasDeal ? 'bg-purple-500' : 'bg-gray-200'}`} title="Deal" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200 font-medium text-gray-500">
            <tr>
              <th className="px-4 py-[5px] font-medium">Entity / Name</th>
              <th className="px-4 py-[5px] font-medium">Lifecycle</th>
              <th className="px-4 py-[5px] font-medium">Current Phase</th>
              <th className="px-4 py-[5px] font-medium">Status</th>
              <th className="px-4 py-[5px] font-medium">Days in Phase</th>
              <th className="px-4 py-[5px] font-medium">Reserved Date</th>
              <th className="px-4 py-[5px] w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.map((row, index) => (
              <TableRow key={row.id} index={index}>
                <TableCell>
                  <div className="font-medium text-gray-900">{row.title}</div>
                </TableCell>
                <TableCell>
                  <Steps row={row} />
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${row.currentStage === 'Opportunity' ? 'bg-blue-100 text-blue-800' : ''}
                    ${row.currentStage === 'Request' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${row.currentStage === 'Deal' ? 'bg-purple-100 text-purple-800' : ''}
                    ${row.currentStage === 'Event' ? 'bg-green-100 text-green-800' : ''}
                  `}>
                    {row.currentStage}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 font-medium text-xs">
                  {row.statusLabel}
                </TableCell>
                <TableCell>
                  {(() => {
                    const days = calculateDaysInPhase(row.phaseStartDate)
                    let colorClass = 'text-gray-600'
                    if (days > 14) colorClass = 'text-red-600 font-semibold'
                    else if (days > 7) colorClass = 'text-orange-500 font-medium'
                    else if (days > 3) colorClass = 'text-yellow-600'
                    
                    return (
                      <span className={`text-sm ${colorClass}`} title={`Since ${row.phaseStartDate.toLocaleDateString()}`}>
                        {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`}
                      </span>
                    )
                  })()}
                </TableCell>
                <TableCell className="text-gray-600">
                  {row.reservedStartDate && (
                    <div className="flex items-center gap-2">
                      <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />
                      <span className="text-xs">
                        {new Date(row.reservedStartDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell align="right" className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === row.id ? null : row.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                  >
                    <MoreVertIcon fontSize="small" />
                  </button>
                  
                  {/* Context Menu */}
                  {menuOpen === row.id && (
                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px] py-1">
                      {row.opportunity && (
                        <button
                          onClick={() => {
                            setSelectedOpportunity(row.opportunity!)
                            setOpportunityModalOpen(true)
                            setMenuOpen(null)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <EditIcon fontSize="small" /> Edit Opportunity
                        </button>
                      )}
                      {row.bookingRequest && (
                        <button
                          onClick={() => {
                            setSelectedRequest(row.bookingRequest!)
                            setRequestModalOpen(true)
                            setMenuOpen(null)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <VisibilityIcon fontSize="small" /> View Request
                        </button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <OpportunityFormModal
        isOpen={opportunityModalOpen}
        onClose={() => setOpportunityModalOpen(false)}
        opportunity={selectedOpportunity}
        onSuccess={() => {}}
      />
      
      <BookingRequestViewModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        requestId={selectedRequest?.id || null}
      />
    </div>
  )
}

