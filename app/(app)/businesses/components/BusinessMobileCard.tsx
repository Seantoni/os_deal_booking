'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types'
import type { FocusPeriod } from '@/lib/utils/focus-period'
import type { ProjectionEntitySummary } from '@/lib/projections/summary'
import { FOCUS_PERIOD_LABELS } from '@/lib/utils/focus-period'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import CampaignIcon from '@mui/icons-material/Campaign'
import LaunchIcon from '@mui/icons-material/Launch'
import { BusinessMobileActionSheet } from './BusinessMobileActionSheet'

interface BusinessMobileCardProps {
  business: Business
  activeFocus: FocusPeriod | undefined
  activeDealUrl: string | undefined
  openOpportunityCount: number
  pendingRequestCount: number
  campaignCount: number
  projectionSummary?: ProjectionEntitySummary
  isAdmin: boolean
  canEdit: boolean
  onCardTap: (business: Business) => void
  onRowHover: () => void
  onSetFocus: (business: Business) => void
  onCreateOpportunity: (business: Business) => void
  onCreateRequest: (business: Business) => void
  onOpenCampaignModal: (business: Business) => void
  onOpenReassignmentModal: (business: Business) => void
}

function getProjectionSourceLabel(source: ProjectionEntitySummary['projectionSource']): string {
  switch (source) {
    case 'actual_deal':
      return 'Actual'
    case 'business_history':
      return 'Histórico'
    case 'category_benchmark':
      return 'Categoría'
    default:
      return 'Sin datos'
  }
}

export function BusinessMobileCard({
  business,
  activeFocus,
  activeDealUrl,
  openOpportunityCount,
  pendingRequestCount,
  campaignCount,
  projectionSummary,
  isAdmin,
  canEdit,
  onCardTap,
  onRowHover,
  onSetFocus,
  onCreateOpportunity,
  onCreateRequest,
  onOpenCampaignModal,
  onOpenReassignmentModal,
}: BusinessMobileCardProps) {
  const router = useRouter()
  const [actionSheetOpen, setActionSheetOpen] = useState(false)

  const handleCardTap = useCallback(() => {
    onCardTap(business)
  }, [business, onCardTap])

  const handleMenuTap = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setActionSheetOpen(true)
  }, [])

  const handleOpenFullPage = useCallback((b: Business) => {
    router.push(`/businesses/${b.id}`)
  }, [router])

  // Category display
  const categoryText = business.category
    ? business.category.subCategory1
      ? `${business.category.parentCategory} › ${business.category.subCategory1}`
      : business.category.parentCategory
    : null

  // Owner display
  const ownerName = business.owner?.name || business.owner?.email || null

  // Collect badges
  const projectedRevenue = projectionSummary?.totalProjectedRevenue ?? 0
  const projectedRequests = projectionSummary?.projectedRequests ?? 0
  const totalRequests = projectionSummary?.totalRequests ?? 0
  const projectionSource = projectionSummary?.projectionSource ?? 'none'
  const projectionSourceLabel = getProjectionSourceLabel(projectionSource)
  const projectionText = projectedRevenue > 0
    ? `Proy. $${projectedRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} · ${projectionSourceLabel}${projectedRequests > 0 ? ` · ${projectedRequests}/${totalRequests}` : ' · Guía'}`
    : 'Proy. Sin datos'

  return (
    <>
      <div
        onClick={handleCardTap}
        onMouseEnter={onRowHover}
        className={`px-4 py-3.5 border-b border-gray-100 active:bg-gray-50 transition-colors ${
          activeFocus ? 'bg-amber-50/40' : 'bg-white'
        }`}
      >
        {/* Top row: Name + Menu button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Business name */}
            <h3 className="text-[14px] font-semibold text-gray-900 leading-tight truncate">
              {business.name}
            </h3>

            {/* Owner · Category */}
            <div className="flex items-center gap-1 mt-1 min-w-0">
              {ownerName && (
                <span className="text-[12px] text-gray-500 truncate flex-shrink-0 max-w-[45%]">
                  {ownerName}
                </span>
              )}
              {ownerName && categoryText && (
                <span className="text-gray-300 text-[10px] flex-shrink-0">·</span>
              )}
              {categoryText && (
                <span className="text-[12px] text-gray-400 truncate">
                  {categoryText}
                </span>
              )}
            </div>
          </div>

          {/* Menu button */}
          <button
            onClick={handleMenuTap}
            className="p-1.5 -mr-1.5 -mt-0.5 rounded-full text-gray-400 active:bg-gray-100 flex-shrink-0 touch-target"
            aria-label="Acciones"
          >
            <MoreVertIcon style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {/* Tier */}
          {business.tier && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              business.tier === 1 ? 'bg-emerald-100 text-emerald-700' :
              business.tier === 2 ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              T{business.tier}
            </span>
          )}

          {/* Focus */}
          {activeFocus && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
              <CenterFocusStrongIcon style={{ fontSize: 11 }} />
              {FOCUS_PERIOD_LABELS[activeFocus].charAt(0)}
            </span>
          )}

          {/* Campaign */}
          {campaignCount > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
              <CampaignIcon style={{ fontSize: 11 }} />
              {campaignCount}
            </span>
          )}

          {/* Active Deal */}
          {activeDealUrl && (
            <a
              href={activeDealUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-medium"
            >
              <LaunchIcon style={{ fontSize: 11 }} />
              Deal
            </a>
          )}

          {/* Open Opportunities */}
          {openOpportunityCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
              {openOpportunityCount} opp{openOpportunityCount > 1 ? 's' : ''}
            </span>
          )}

          {/* Pending Requests */}
          {pendingRequestCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium">
              {pendingRequestCount} solic.
            </span>
          )}

          {/* Projected Revenue */}
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              projectedRevenue > 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {projectionText}
          </span>
        </div>
      </div>

      {/* Action Sheet */}
      {actionSheetOpen && (
        <BusinessMobileActionSheet
          business={business}
          activeFocus={activeFocus}
          activeDealUrl={activeDealUrl}
          campaignCount={campaignCount}
          isAdmin={isAdmin}
          canEdit={canEdit}
          onClose={() => setActionSheetOpen(false)}
          onSetFocus={onSetFocus}
          onCreateOpportunity={onCreateOpportunity}
          onCreateRequest={onCreateRequest}
          onOpenCampaignModal={onOpenCampaignModal}
          onOpenReassignmentModal={onOpenReassignmentModal}
          onOpenFullPage={handleOpenFullPage}
        />
      )}
    </>
  )
}
