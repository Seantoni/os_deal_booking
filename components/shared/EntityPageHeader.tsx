'use client'

import { ReactNode } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import { Input } from '@/components/ui'
import { SavedFiltersBar, AdvancedFilterBuilder } from '@/components/filters'
import { FilterTabs } from '@/components/shared'
import type { SavedFilter, FilterRule } from '@/app/actions/filters'

export interface FilterTab {
  id: string
  label: string
  count?: number  // Optional - shows without count if undefined
}

interface EntityPageHeaderProps {
  /** Entity type for the advanced filter builder (optional - no advanced filters if not provided) */
  entityType?: 'deals' | 'opportunities' | 'businesses' | 'leads' | 'marketing'
  
  /** Search configuration */
  searchPlaceholder: string
  searchQuery: string
  onSearchChange: (query: string) => void
  
  /** Filter tabs configuration */
  filterTabs: FilterTab[]
  activeFilter: string
  onFilterChange: (filterId: string) => void
  
  /** Saved filters configuration (optional) */
  savedFilters?: SavedFilter[]
  activeFilterId?: string | null
  onFilterSelect?: (filter: SavedFilter | null) => void
  
  /** Advanced filters (optional) */
  onAdvancedFiltersChange?: (rules: FilterRule[]) => void
  onSavedFiltersChange?: () => void
  
  /** Whether user is admin (shows advanced filter builder) */
  isAdmin: boolean
  
  /** Optional right side content (e.g., "New Business" button) */
  rightContent?: ReactNode
  
  /** Optional content between search and filters (e.g., view toggle) */
  beforeFilters?: ReactNode
  
  /** Optional user filter dropdown (admin quick filter) - appears after saved filters with separator */
  userFilter?: ReactNode
}

/**
 * Shared page header component for entity pages.
 * 
 * Includes:
 * - Search input
 * - Filter tabs with counts
 * - Saved filters bar
 * - Advanced filter builder (for admins)
 * 
 * @example
 * ```tsx
 * <EntityPageHeader
 *   entityType="businesses"
 *   searchPlaceholder="Search businesses..."
 *   searchQuery={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   filterTabs={[
 *     { id: 'all', label: 'All', count: 100 },
 *     { id: 'active', label: 'Active', count: 75 },
 *   ]}
 *   activeFilter={opportunityFilter}
 *   onFilterChange={setOpportunityFilter}
 *   savedFilters={savedFilters}
 *   activeFilterId={activeFilterId}
 *   onFilterSelect={handleFilterSelect}
 *   onAdvancedFiltersChange={handleAdvancedFiltersChange}
 *   onSavedFiltersChange={loadSavedFilters}
 *   isAdmin={isAdmin}
 *   rightContent={<NewBusinessButton />}
 * />
 * ```
 */
export function EntityPageHeader({
  entityType,
  searchPlaceholder,
  searchQuery,
  onSearchChange,
  filterTabs,
  activeFilter,
  onFilterChange,
  savedFilters,
  activeFilterId,
  onFilterSelect,
  onAdvancedFiltersChange,
  onSavedFiltersChange,
  isAdmin,
  rightContent,
  beforeFilters,
  userFilter,
}: EntityPageHeaderProps) {
  const activeFilterObject = savedFilters?.find(f => f.id === activeFilterId) || null
  const showAdvancedFilters = isAdmin && entityType && onAdvancedFiltersChange && onSavedFiltersChange
  const showSavedFilters = savedFilters && savedFilters.length > 0 && onFilterSelect

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex flex-col gap-2">
        {/* Top row: Search + Right Content */}
        <div className="flex items-center justify-between gap-3">
          {/* Search */}
          <div className="flex-1 max-w-xs">
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              size="sm"
              leftIcon={<SearchIcon className="w-4 h-4" />}
              className="text-xs"
            />
          </div>

          {/* Right Content */}
          {rightContent}
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Optional content before filters (e.g., view toggle) */}
          {beforeFilters}
          
          {beforeFilters && <div className="h-5 w-px bg-gray-200 mx-0.5 flex-shrink-0"></div>}

          {/* Filter Tabs */}
          <FilterTabs
            items={filterTabs}
            activeId={activeFilter}
            onChange={onFilterChange}
          />

          {/* Divider & Saved Filters */}
          {showSavedFilters && (
            <>
              <div className="h-5 w-px bg-gray-300 mx-1 flex-shrink-0"></div>
              <div className="flex-shrink-0">
                <SavedFiltersBar
                  savedFilters={savedFilters!}
                  activeFilterId={activeFilterId || null}
                  onFilterSelect={onFilterSelect!}
                  isAdmin={isAdmin}
                />
              </div>
            </>
          )}

          {/* User Filter (Admin Quick Filter) - After saved filters */}
          {userFilter && (
            <>
              <div className="h-5 w-px bg-gray-300 mx-1 flex-shrink-0"></div>
              {userFilter}
            </>
          )}
        </div>

        {/* Advanced Filter Builder */}
        {showAdvancedFilters && entityType !== 'marketing' && (
          <AdvancedFilterBuilder
            entityType={entityType as 'deals' | 'opportunities' | 'businesses' | 'leads'}
            savedFilters={savedFilters || []}
            onFiltersChange={onAdvancedFiltersChange!}
            onSavedFiltersChange={onSavedFiltersChange!}
            activeFilter={activeFilterObject}
          />
        )}
      </div>
    </div>
  )
}

