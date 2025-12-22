'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { formatShortDateNoYear } from '@/lib/date'
import { getMarketingCampaigns } from '@/app/actions/marketing'
import CampaignIcon from '@mui/icons-material/Campaign'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FilterListIcon from '@mui/icons-material/FilterList'
import InstagramIcon from '@mui/icons-material/Instagram'
import BusinessIcon from '@mui/icons-material/Business'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import toast from 'react-hot-toast'
import { useUserRole } from '@/hooks/useUserRole'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { EntityTable, StatusPill, TableRow, TableCell } from '@/components/shared/table'
import { Button } from '@/components/ui'

// Lazy load heavy modal component
const MarketingCampaignModal = dynamic(
  () => import('@/components/marketing/MarketingCampaignModal'),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    ),
    ssr: false,
  }
)

// Types
interface MarketingCampaignData {
  id: string
  bookingRequestId: string
  doMarketing: boolean
  skipReason: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  bookingRequest: {
    id: string
    name: string
    merchant: string | null
    businessEmail: string
    parentCategory: string | null
    subCategory1: string | null
    startDate: Date
    endDate: Date
    status: string
    processedAt: Date | null
    userId: string
  }
  options: Array<{
    id: string
    platform: string
    optionType: string
    isPlanned: boolean
    isCompleted: boolean
    dueDate: Date | null
  }>
  createdByUser: { clerkId: string; name: string | null; email: string | null } | null
  bookingRequestUser: { clerkId: string; name: string | null; email: string | null } | null
  progress: {
    planned: number
    completed: number
  }
}

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'businessName', label: 'Business Name', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'bookedDate', label: 'Booked', sortable: true },
  { key: 'runAt', label: 'Run At', sortable: true },
  { key: 'instagram', label: 'Instagram', align: 'center' },
  { key: 'tiktok', label: 'TikTok', align: 'center' },
  { key: 'ofertasimple', label: 'OfertaSimple', align: 'center' },
  { key: 'progress', label: 'Progress', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
]

// Platform status component
function PlatformStatus({ options, platform }: { options: MarketingCampaignData['options']; platform: string }) {
  const platformOptions = options.filter(o => o.platform === platform)
  const planned = platformOptions.filter(o => o.isPlanned).length
  const completed = platformOptions.filter(o => o.isPlanned && o.isCompleted).length
  
  if (planned === 0) {
    return <span className="text-gray-300">—</span>
  }
  
  const isAllComplete = completed === planned
  
  return (
    <div className="flex items-center justify-center gap-1">
      {isAllComplete ? (
        <CheckCircleIcon className="text-green-500" style={{ fontSize: 18 }} />
      ) : (
        <span className="text-xs font-medium text-gray-600">
          {completed}/{planned}
        </span>
      )}
    </div>
  )
}

export default function MarketingPageClient() {
  const { isAdmin, isMarketing } = useUserRole()
  const canEdit = isAdmin || isMarketing
  
  // Data state
  const [campaigns, setCampaigns] = useState<MarketingCampaignData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(50)

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getMarketingCampaigns()
      if (result.success && result.data) {
        setCampaigns(result.data as MarketingCampaignData[])
      } else {
        toast.error(result.error || 'Failed to load campaigns')
      }
    } catch (error) {
      toast.error('An error occurred loading campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // Filter tabs
  const filterTabs: FilterTab[] = useMemo(() => {
    const doMarketingCount = campaigns.filter(c => c.doMarketing).length
    const skipMarketingCount = campaigns.filter(c => !c.doMarketing).length
    const completedCount = campaigns.filter(c => c.doMarketing && c.progress.planned > 0 && c.progress.completed === c.progress.planned).length
    const inProgressCount = campaigns.filter(c => c.doMarketing && c.progress.planned > 0 && c.progress.completed < c.progress.planned).length
    
    return [
      { id: 'all', label: 'All', count: campaigns.length },
      { id: 'active', label: 'Active', count: doMarketingCount },
      { id: 'in_progress', label: 'In Progress', count: inProgressCount },
      { id: 'completed', label: 'Completed', count: completedCount },
      { id: 'skipped', label: 'Skipped', count: skipMarketingCount },
    ]
  }, [campaigns])

  // Sorting
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn])

  // Get sort value
  const getSortValue = useCallback((campaign: MarketingCampaignData, column: string): string | number | null => {
    switch (column) {
      case 'businessName':
        return (campaign.bookingRequest.merchant || campaign.bookingRequest.name || '').toLowerCase()
      case 'category':
        return (campaign.bookingRequest.parentCategory || '').toLowerCase()
      case 'bookedDate':
        return campaign.bookingRequest.processedAt ? new Date(campaign.bookingRequest.processedAt).getTime() : 0
      case 'runAt':
        return new Date(campaign.bookingRequest.startDate).getTime()
      case 'progress':
        return campaign.progress.planned > 0 ? campaign.progress.completed / campaign.progress.planned : 0
      default:
        return null
    }
  }, [])

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns

    // Status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'active':
          filtered = filtered.filter(c => c.doMarketing)
          break
        case 'in_progress':
          filtered = filtered.filter(c => c.doMarketing && c.progress.planned > 0 && c.progress.completed < c.progress.planned)
          break
        case 'completed':
          filtered = filtered.filter(c => c.doMarketing && c.progress.planned > 0 && c.progress.completed === c.progress.planned)
          break
        case 'skipped':
          filtered = filtered.filter(c => !c.doMarketing)
          break
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        (c.bookingRequest.merchant || '').toLowerCase().includes(query) ||
        (c.bookingRequest.name || '').toLowerCase().includes(query) ||
        (c.bookingRequest.businessEmail || '').toLowerCase().includes(query) ||
        (c.bookingRequest.parentCategory || '').toLowerCase().includes(query)
      )
    }

    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = getSortValue(a, sortColumn)
        const bVal = getSortValue(b, sortColumn)
        
        if (aVal === null || bVal === null) return 0
        
        let comparison = 0
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal)
        } else {
          comparison = (aVal as number) - (bVal as number)
        }
        
        return sortDirection === 'desc' ? -comparison : comparison
      })
    }

    return filtered
  }, [campaigns, statusFilter, searchQuery, sortColumn, sortDirection, getSortValue])

  const visibleCampaigns = useMemo(() => filteredCampaigns.slice(0, visibleCount), [filteredCampaigns, visibleCount])

  // Handlers
  const handleOpenModal = (campaign: MarketingCampaignData) => {
    setSelectedCampaignId(campaign.id)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedCampaignId(null)
  }

  const handleSuccess = () => {
    loadCampaigns()
  }

return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <EntityPageHeader
        entityType="marketing"
        searchPlaceholder="Search campaigns..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTabs={filterTabs}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        isAdmin={canEdit}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">
            Loading campaigns...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <EmptyTableState
            icon={<CampaignIcon className="w-full h-full" />}
            title={
              searchQuery || statusFilter !== 'all'
                ? 'No campaigns match your filters'
                : 'No marketing campaigns yet'
            }
            description={
              searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Marketing campaigns will appear here once booking requests are marked as booked'
            }
          />
        ) : (
          <>
            <EntityTable
              columns={COLUMNS}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {visibleCampaigns.map((campaign, index) => (
                <TableRow
                  key={campaign.id}
                  index={index}
                  onClick={() => handleOpenModal(campaign)}
                >
                  {/* Business Name */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!campaign.doMarketing && (
                        <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" title="Marketing skipped" />
                      )}
                      <span className="text-[13px] font-medium text-gray-900">
                        {campaign.bookingRequest.merchant || campaign.bookingRequest.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell className="text-[13px] text-gray-600">
                    {campaign.bookingRequest.parentCategory || '-'}
                    {campaign.bookingRequest.subCategory1 && (
                      <span className="text-gray-400"> › {campaign.bookingRequest.subCategory1}</span>
                    )}
                  </TableCell>

                  {/* Booked Date */}
                  <TableCell className="text-[13px] text-gray-600">
                    {formatShortDateNoYear(campaign.bookingRequest.processedAt)}
                  </TableCell>

                  {/* Run At Date */}
                  <TableCell className="text-[13px] text-gray-600">
                    {formatShortDateNoYear(campaign.bookingRequest.startDate)}
                  </TableCell>

                  {/* Instagram */}
                  <TableCell align="center">
                    <PlatformStatus options={campaign.options} platform="instagram" />
                  </TableCell>

                  {/* TikTok */}
                  <TableCell align="center">
                    <PlatformStatus options={campaign.options} platform="tiktok" />
                  </TableCell>

                  {/* OfertaSimple */}
                  <TableCell align="center">
                    <PlatformStatus options={campaign.options} platform="ofertasimple" />
                  </TableCell>

                  {/* Progress */}
                  <TableCell align="center">
                    {campaign.doMarketing ? (
                      campaign.progress.planned > 0 ? (
                        <StatusPill
                          label={`${campaign.progress.completed}/${campaign.progress.planned}`}
                          tone={
                            campaign.progress.completed === campaign.progress.planned
                              ? 'success'
                              : campaign.progress.completed > 0
                              ? 'info'
                              : 'neutral'
                          }
                        />
                      ) : (
                        <span className="text-xs text-gray-400">Not planned</span>
                      )
                    ) : (
                      <StatusPill label="Skipped" tone="neutral" />
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenModal(campaign)
                      }}
                      leftIcon={<VisibilityIcon style={{ fontSize: 16 }} />}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </EntityTable>

            {visibleCount < filteredCampaigns.length && (
              <div className="p-4 border-t border-gray-100 text-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 50)}
                >
                  Load More ({filteredCampaigns.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Marketing Campaign Modal */}
      <MarketingCampaignModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        campaignId={selectedCampaignId}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

