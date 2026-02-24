/**
 * Business table row component
 * 
 * Renders a single business row with expandable deals sub-table.
 */

'use client'

import { Fragment } from 'react'
import type { Business } from '@/types'
import type { SimplifiedDeal } from '@/app/actions/deal-metrics'
import type { ProjectionEntitySummary } from '@/lib/projections/summary'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import CampaignIcon from '@mui/icons-material/Campaign'
import { FOCUS_PERIOD_LABELS, type FocusPeriod } from '@/lib/utils/focus-period'
import { TableRow, TableCell } from '@/components/shared/table'
import { BusinessActionButtons } from './BusinessActionButtons'
import { BusinessExpandedDeals } from './BusinessExpandedDeals'

interface BusinessDealsCache {
  deals: SimplifiedDeal[]
  totalCount: number
  loading: boolean
}

interface BusinessTableRowProps {
  business: Business
  index: number
  activeFocus: FocusPeriod | undefined
  isExpanded: boolean
  cachedDeals: BusinessDealsCache | null
  activeDealUrl: string | undefined
  openOpportunityCount: number
  pendingRequestCount: number
  campaignCount: number
  projectionSummary?: ProjectionEntitySummary
  isAdmin: boolean
  canEdit: boolean // Whether user can edit this business
  
  // Callbacks
  onRowClick: (business: Business) => void
  onRowHover: () => void
  onToggleExpand: (business: Business) => void
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

export function BusinessTableRow({
  business,
  index,
  activeFocus,
  isExpanded,
  cachedDeals,
  activeDealUrl,
  openOpportunityCount,
  pendingRequestCount,
  campaignCount,
  projectionSummary,
  isAdmin,
  canEdit,
  onRowClick,
  onRowHover,
  onToggleExpand,
  onSetFocus,
  onCreateOpportunity,
  onCreateRequest,
  onOpenCampaignModal,
  onOpenReassignmentModal,
}: BusinessTableRowProps) {
  const isLoadingDeals = cachedDeals?.loading ?? false
  const deals = cachedDeals?.deals ?? []
  const totalCount = cachedDeals?.totalCount ?? 0
  const hasTopRevenueMetric = Boolean(business.topRevenueAmount)
  const isArrowMuted = !hasTopRevenueMetric
  const isExpandDisabled = !hasTopRevenueMetric && !isExpanded
  const fallbackProjectedRevenue = business.topRevenueAmount ? Number(business.topRevenueAmount) : 0
  const projectedRevenue = (projectionSummary?.totalProjectedRevenue ?? 0) > 0
    ? (projectionSummary?.totalProjectedRevenue ?? 0)
    : fallbackProjectedRevenue
  const projectedRequests = projectionSummary?.projectedRequests ?? 0
  const totalRequests = projectionSummary?.totalRequests ?? 0
  const projectionSource = projectionSummary?.projectionSource ?? 'none'
  const usesDealMetricsFallback = (projectionSummary?.totalProjectedRevenue ?? 0) <= 0 && fallbackProjectedRevenue > 0
  const projectionSourceLabel = getProjectionSourceLabel(projectionSource)
  const projectionDetail = projectionSource === 'none'
    ? (usesDealMetricsFallback ? 'Deals · Guía' : 'Sin datos')
    : projectedRequests > 0
      ? `${projectionSourceLabel} · ${projectedRequests}/${totalRequests}`
      : `${projectionSourceLabel} · Guía`

  return (
    <Fragment key={business.id}>
      {/* Business Row */}
      <TableRow
        index={index}
        onClick={() => onRowClick(business)}
        onMouseEnter={onRowHover}
        className={activeFocus ? 'bg-amber-50/50 hover:bg-amber-50' : undefined}
      >
        {/* Expand/Collapse Button */}
        <TableCell onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleExpand(business)}
            className={`p-1 rounded transition-colors ${
              isExpandDisabled
                ? 'text-slate-300 cursor-not-allowed'
                : isArrowMuted
                  ? 'text-slate-300 hover:bg-slate-100 hover:text-slate-300'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
            disabled={isExpandDisabled}
          >
            {isExpanded ? (
              <ExpandMoreIcon style={{ fontSize: 20 }} className={isArrowMuted ? 'opacity-40' : ''} />
            ) : (
              <ChevronRightIcon style={{ fontSize: 20 }} className={isArrowMuted ? 'opacity-40' : ''} />
            )}
          </button>
        </TableCell>
        
        {/* Name with badges */}
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-[13px]">
              {business.name}
            </span>
            {activeFocus && (
              <span 
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium"
                title={`Foco: ${FOCUS_PERIOD_LABELS[activeFocus]}`}
              >
                <CenterFocusStrongIcon style={{ fontSize: 12 }} />
                {FOCUS_PERIOD_LABELS[activeFocus].charAt(0)}
              </span>
            )}
            {campaignCount > 0 && (
              <span 
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium"
                title={`En ${campaignCount} campaña(s)`}
              >
                <CampaignIcon style={{ fontSize: 12 }} />
                {campaignCount}
              </span>
            )}
          </div>
        </TableCell>
        
        {/* Category */}
        <TableCell>
          {business.category ? (
            <span className="text-xs text-gray-600">
              {business.category.parentCategory}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>
        
        {/* Tier */}
        <TableCell align="center">
          {business.tier ? (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
              business.tier === 1 ? 'bg-emerald-100 text-emerald-700' :
              business.tier === 2 ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              T{business.tier}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>
        
        {/* Owner */}
        <TableCell>
          {business.owner ? (
            <span className="text-xs text-gray-600" title={business.owner.email || undefined}>
              {business.owner.name || business.owner.email || '-'}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>
        
        {/* Top Vendido */}
        <TableCell align="right">
          {business.topSoldQuantity ? (
            business.topSoldDealUrl ? (
              <a
                href={business.topSoldDealUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                {business.topSoldQuantity.toLocaleString()}
              </a>
            ) : (
              <span className="text-xs font-medium text-gray-700">
                {business.topSoldQuantity.toLocaleString()}
              </span>
            )
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>
        
        {/* Top Ingresos */}
        <TableCell align="right">
          {business.topRevenueAmount ? (
            business.topRevenueDealUrl ? (
              <a
                href={business.topRevenueDealUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                ${Number(business.topRevenueAmount).toLocaleString()}
              </a>
            ) : (
              <span className="text-xs font-medium text-gray-700">
                ${Number(business.topRevenueAmount).toLocaleString()}
              </span>
            )
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>
        
        {/* Último Lanzamiento */}
        <TableCell align="center">
          {business.lastLaunchDate ? (
            <span 
              className="text-xs text-slate-600"
              title={new Date(business.lastLaunchDate).toLocaleDateString()}
            >
              {Math.floor((Date.now() - new Date(business.lastLaunchDate).getTime()) / (1000 * 60 * 60 * 24))}d
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>
        
        {/* Deals (360d) */}
        <TableCell align="center">
          {business.totalDeals360d ? (
            <span className="text-xs font-medium text-gray-700">
              {business.totalDeals360d}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>
        
        {/* Open Opportunities */}
        <TableCell align="center">
          {openOpportunityCount > 0 ? (
            <span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
              {openOpportunityCount}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>
        
        {/* Pending Requests */}
        <TableCell align="center">
          {pendingRequestCount > 0 ? (
            <span className="inline-flex px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
              {pendingRequestCount}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </TableCell>

        {/* Projected Revenue */}
        <TableCell align="right">
          <div className="flex flex-col items-end leading-tight">
            {projectedRevenue > 0 ? (
              <span className="text-xs font-semibold text-emerald-700">
                ${projectedRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
            <span className="text-[10px] text-gray-500">
              {projectionDetail}
            </span>
          </div>
        </TableCell>
        
        {/* Actions */}
        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
          <BusinessActionButtons
            business={business}
            activeFocus={activeFocus}
            activeDealUrl={activeDealUrl}
            campaignCount={campaignCount}
            isAdmin={isAdmin}
            canEdit={canEdit}
            onSetFocus={onSetFocus}
            onCreateOpportunity={onCreateOpportunity}
            onCreateRequest={onCreateRequest}
            onOpenCampaignModal={onOpenCampaignModal}
            onOpenReassignmentModal={onOpenReassignmentModal}
          />
        </TableCell>
      </TableRow>

      {/* Expanded Deals Rows */}
      {isExpanded && (
        <BusinessExpandedDeals
          businessId={business.id}
          isLoading={isLoadingDeals}
          deals={deals}
          totalCount={totalCount}
        />
      )}
    </Fragment>
  )
}
