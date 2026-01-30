/**
 * Business table row component
 * 
 * Renders a single business row with expandable deals sub-table.
 */

'use client'

import { Fragment } from 'react'
import type { Business } from '@/types'
import type { SimplifiedDeal } from '@/app/actions/deal-metrics'
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
  isAdmin: boolean
  actionMenuOpen: string | null
  
  // Callbacks
  onRowClick: (business: Business) => void
  onRowHover: () => void
  onToggleExpand: (business: Business) => void
  onSetActionMenuOpen: (id: string | null) => void
  onSetFocus: (business: Business) => void
  onCreateOpportunity: (business: Business) => void
  onCreateRequest: (business: Business) => void
  onOpenCampaignModal: (business: Business) => void
  onOpenReassignmentModal: (business: Business) => void
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
  isAdmin,
  actionMenuOpen,
  onRowClick,
  onRowHover,
  onToggleExpand,
  onSetActionMenuOpen,
  onSetFocus,
  onCreateOpportunity,
  onCreateRequest,
  onOpenCampaignModal,
  onOpenReassignmentModal,
}: BusinessTableRowProps) {
  const hasDeals = (business.totalDeals360d ?? 0) > 0
  const isLoadingDeals = cachedDeals?.loading ?? false
  const deals = cachedDeals?.deals ?? []
  const totalCount = cachedDeals?.totalCount ?? 0

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
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            disabled={!hasDeals || !business.osAdminVendorId}
          >
            {isExpanded ? (
              <ExpandMoreIcon style={{ fontSize: 20 }} />
            ) : (
              <ChevronRightIcon style={{ fontSize: 20 }} className={!hasDeals || !business.osAdminVendorId ? 'opacity-30' : ''} />
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
              {business.category.subCategory1 && ` › ${business.category.subCategory1}`}
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
        
        {/* Actions */}
        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
          <BusinessActionButtons
            business={business}
            activeFocus={activeFocus}
            activeDealUrl={activeDealUrl}
            campaignCount={campaignCount}
            isAdmin={isAdmin}
            actionMenuOpen={actionMenuOpen}
            onSetActionMenuOpen={onSetActionMenuOpen}
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
