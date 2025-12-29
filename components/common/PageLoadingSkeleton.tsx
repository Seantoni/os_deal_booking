'use client'

import type { ReactNode } from 'react'
import { useContext } from 'react'
import { SidebarContext } from './AppClientProviders'

function SafePageContent({ children }: { children: ReactNode }) {
  // Optional sidebar context; fallback to no margin if provider is missing
  const sidebar = useContext(SidebarContext)
  let desktopMargin = ''
  if (sidebar && !sidebar.isCalendarPage && sidebar.isOpen) {
    desktopMargin = sidebar.isCollapsed ? 'md:ml-14' : 'md:ml-44'
  }

  return (
    <div className={`flex-1 transition-all duration-300 ml-0 ${desktopMargin}`}>
      {children}
    </div>
  )
}

function SkeletonLayout({ children }: { children: ReactNode }) {
  return (
    <SafePageContent>
      <div className="h-full overflow-hidden">
        {children}
      </div>
    </SafePageContent>
  )
}

/**
 * Page-specific loading skeletons
 * These are used inside AppLayout to show loading states
 * while keeping the sidebar and header visible
 */

// Legacy wrapper no longer shows sidebar placeholder (sidebar is rendered by the route layout)
export function AppLayoutSkeleton({ children }: { children: ReactNode }) {
  return (
    <SkeletonLayout>
      <div className="h-full flex flex-col bg-gray-50 animate-pulse">
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </SkeletonLayout>
  )
}

export function DashboardLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 animate-pulse">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-gray-300 rounded"></div>
            <div className="h-6 bg-gray-300 rounded w-28"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="ml-auto flex gap-4">
                  <div className="h-5 bg-gray-200 rounded w-12"></div>
                  <div className="h-5 bg-gray-200 rounded w-12"></div>
                  <div className="h-5 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-4 w-4 bg-gray-100 rounded"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* Request Flow */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-gray-50">
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-gray-100 rounded p-2 text-center">
                  <div className="h-6 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function ReservationsLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Header with search */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 bg-gray-200 rounded w-72"></div>
            <div className="h-4 bg-gray-100 rounded w-24"></div>
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="bg-gray-50 px-4 py-2 flex items-center gap-4 border-b border-gray-200">
            <div className="h-4 w-4 bg-gray-300 rounded"></div>
            {['w-40', 'w-24', 'w-24', 'w-20', 'w-20', 'w-16'].map((w, i) => (
              <div key={i} className={`h-3 bg-gray-300 rounded ${w}`}></div>
            ))}
          </div>
          
          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="px-4 py-2 flex items-center gap-4 border-b border-gray-100">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="flex flex-col gap-1 w-40">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-100 rounded w-24"></div>
              </div>
              <div className="h-5 bg-blue-100 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-16 ml-auto text-right"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function BookingRequestsLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Header with search, filters, and action button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Top row: Search + New button */}
          <div className="flex items-center justify-between gap-3">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-blue-100 rounded w-32"></div>
            </div>
          </div>
          
          {/* Filter tabs row */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {['All', 'Draft', 'Pending', 'Approved', 'Booked', 'Rejected'].map((_, i) => (
              <div key={i} className={`h-7 ${i === 0 ? 'bg-gray-300' : 'bg-gray-200'} rounded-full w-20 flex-shrink-0`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="bg-gray-50 px-4 py-3 flex items-center gap-4 border-b border-gray-100">
            <div className="h-4 w-4 bg-gray-300 rounded"></div>
            {['w-16', 'w-14', 'w-28', 'w-36', 'w-20', 'w-24', 'w-20', 'w-12'].map((w, i) => (
              <div key={i} className={`h-3 bg-gray-300 rounded ${w}`}></div>
            ))}
          </div>
          
          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-14"></div>
              <div className="h-4 bg-gray-200 rounded w-28"></div>
              <div className="h-4 bg-gray-200 rounded w-36"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="ml-auto h-6 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function PipelineLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="h-8 bg-gray-200 rounded w-full max-w-md"></div>
          
          {/* Tabs */}
          <div className="flex gap-6 border-b border-gray-200 -mb-3">
            {['All (Unified)', 'Opportunities', 'Requests', 'Deals', 'Events'].map((_, i) => (
              <div key={i} className={`h-4 ${i === 0 ? 'bg-gray-400' : 'bg-gray-200'} rounded w-28 pb-3`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center gap-4 border-b border-gray-100">
            {['w-32', 'w-20', 'w-24', 'w-24', 'w-20', 'w-28'].map((w, i) => (
              <div key={i} className={`h-3 bg-gray-300 rounded ${w}`}></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-5 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-28"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function TablePageLoadingSkeleton({ 
  columns = 6, 
  showFilterTabs = true,
  showAdvancedFilters = true,
  filterTabCount = 3 
}: { 
  columns?: number
  showFilterTabs?: boolean
  showAdvancedFilters?: boolean
  filterTabCount?: number
}) {
  const widths = ['w-32', 'w-28', 'w-36', 'w-24', 'w-20', 'w-24', 'w-28', 'w-20']
  
  return (
    <SkeletonLayout>
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Header with EntityPageHeader-style layout */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex flex-col gap-2">
          {/* Top row: Search + Action button */}
          <div className="flex items-center justify-between gap-3">
            <div className="h-7 bg-gray-200 rounded w-48"></div>
            <div className="h-8 bg-blue-100 rounded w-28"></div>
          </div>
          
          {/* Filter tabs row */}
          {showFilterTabs && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {Array.from({ length: filterTabCount }).map((_, i) => (
                <div key={i} className={`h-6 ${i === 0 ? 'bg-gray-400' : 'bg-gray-200'} rounded-full w-20 flex-shrink-0`}></div>
              ))}
              {/* Saved filters divider + pills */}
              <div className="h-5 w-px bg-gray-300 mx-1 flex-shrink-0"></div>
              <div className="h-6 bg-gray-100 rounded-full w-24 flex-shrink-0"></div>
              <div className="h-6 bg-gray-100 rounded-full w-20 flex-shrink-0"></div>
            </div>
          )}
          
          {/* Advanced filters row */}
          {showAdvancedFilters && (
            <div className="flex items-center gap-2 py-1">
              <div className="h-7 bg-gray-100 rounded w-28"></div>
              <div className="h-7 bg-gray-100 rounded w-24"></div>
              <div className="ml-auto flex gap-2">
                <div className="h-7 bg-gray-100 rounded w-16"></div>
                <div className="h-7 bg-gray-100 rounded w-20"></div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center gap-4 border-b border-gray-100">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className={`h-3 bg-gray-300 rounded ${widths[i] || 'w-24'}`}></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <div key={row} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
              {Array.from({ length: columns }).map((_, i) => (
                <div key={i} className={`h-4 bg-gray-200 rounded ${widths[i] || 'w-24'}`}></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function DealsLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex flex-col gap-3">
          {/* Top row: Search */}
          <div className="flex items-center justify-between gap-3">
              <div className="h-8 bg-gray-100 rounded-lg w-56"></div>
          </div>
          
            {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
            {['All', 'Unassigned', 'User 1', 'User 2'].map((_, i) => (
                <div key={i} className={`h-7 ${i === 0 ? 'bg-gray-200' : 'bg-gray-100'} rounded-full px-4 w-24 flex-shrink-0`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50/80 px-4 py-3 flex items-center gap-4">
            {['w-40', 'w-28', 'w-28', 'w-24', 'w-20', 'w-24', 'w-20'].map((w, i) => (
                <div key={i} className={`h-3 bg-gray-200 rounded ${w}`}></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <div className="h-4 bg-gray-100 rounded w-40"></div>
                <div className="h-4 bg-gray-100 rounded w-28"></div>
                <div className="h-4 bg-gray-100 rounded w-28"></div>
                <div className="h-4 bg-gray-100 rounded w-24"></div>
                <div className="h-4 bg-gray-100 rounded w-20"></div>
                <div className="h-4 bg-gray-100 rounded w-24"></div>
                <div className="h-5 bg-gray-100 rounded-full w-20"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function BusinessesLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex flex-col gap-3">
          {/* Top row: Search + New button */}
          <div className="flex items-center justify-between gap-3">
              <div className="h-8 bg-gray-100 rounded-lg w-56"></div>
              <div className="h-8 bg-blue-50 rounded-lg w-32"></div>
          </div>
          
            {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
            {['All', 'With Open Opp', 'Without Open Opp'].map((_, i) => (
                <div key={i} className={`h-7 ${i === 0 ? 'bg-gray-200' : 'bg-gray-100'} rounded-full px-4 w-32 flex-shrink-0`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50/80 px-4 py-3 flex items-center gap-4">
            {['w-40', 'w-28', 'w-36', 'w-28', 'w-20', 'w-12'].map((w, i) => (
                <div key={i} className={`h-3 bg-gray-200 rounded ${w}`}></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <div className="h-4 bg-gray-100 rounded w-40"></div>
                <div className="h-4 bg-gray-100 rounded w-28"></div>
                <div className="h-4 bg-gray-100 rounded w-36"></div>
                <div className="h-4 bg-gray-100 rounded w-28"></div>
                <div className="h-4 bg-gray-100 rounded w-20"></div>
                <div className="h-4 bg-gray-100 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

/**
 * Kanban board skeleton - matches the actual Kanban layout
 */
export function KanbanLoadingSkeleton({ columns = 6 }: { columns?: number }) {
  const columnColors = [
    'border-gray-300',
    'border-blue-300', 
    'border-yellow-300',
    'border-purple-300',
    'border-green-300',
    'border-red-300',
  ]
  
  return (
    <div className="h-full overflow-x-auto pb-2">
      <div className="flex gap-4 h-full min-w-max px-1">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div 
            key={colIndex} 
            className={`w-72 flex-shrink-0 bg-gray-100/50 rounded-lg border-t-2 ${columnColors[colIndex] || 'border-gray-300'}`}
          >
            {/* Column header */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
                <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
              </div>
            </div>
            
            {/* Cards */}
            <div className="p-2 space-y-2">
              {Array.from({ length: colIndex === 0 ? 4 : colIndex === 1 ? 3 : 2 }).map((_, cardIndex) => (
                <div 
                  key={cardIndex} 
                  className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-3"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-gray-100 rounded w-16"></div>
                    <div className="h-5 w-5 bg-gray-100 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function OpportunitiesLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex flex-col gap-3">
          {/* Top row: View toggle + Search */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* View toggle buttons */}
              <div className="flex p-0.5 bg-gray-100 rounded-md">
                <div className="h-6 w-6 bg-white rounded shadow-sm"></div>
                <div className="h-6 w-6 bg-transparent rounded"></div>
              </div>
                <div className="h-8 bg-gray-100 rounded-lg w-56"></div>
            </div>
          </div>
          
          {/* Filter tabs (stages) */}
            <div className="flex items-center gap-2 overflow-x-auto">
            {['All', 'Iniciación', 'Reunión', 'Propuesta', 'Won', 'Lost'].map((_, i) => (
                <div key={i} className={`h-7 ${i === 0 ? 'bg-gray-200' : 'bg-gray-100'} rounded-full px-4 w-24 flex-shrink-0`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Kanban Board (default view) */}
      <div className="flex-1 overflow-auto p-4">
        <KanbanLoadingSkeleton columns={6} />
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function LeadsLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex flex-col gap-3">
          {/* Top row: Search + New button */}
          <div className="flex items-center justify-between gap-3">
              <div className="h-8 bg-gray-100 rounded-lg w-56"></div>
              <div className="h-8 bg-blue-50 rounded-lg w-28"></div>
          </div>
          
          {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
            {['All', 'New', 'Contacted', 'Qualified', 'Converted'].map((_, i) => (
                <div key={i} className={`h-7 ${i === 0 ? 'bg-gray-200' : 'bg-gray-100'} rounded-full px-4 w-24 flex-shrink-0`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50/80 px-4 py-3 flex items-center gap-4">
            {['w-40', 'w-28', 'w-36', 'w-28', 'w-28', 'w-24', 'w-20'].map((w, i) => (
                <div key={i} className={`h-3 bg-gray-200 rounded ${w}`}></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <div className="h-4 bg-gray-100 rounded w-40"></div>
                <div className="h-4 bg-gray-100 rounded w-28"></div>
                <div className="h-4 bg-gray-100 rounded w-36"></div>
                <div className="h-4 bg-gray-100 rounded w-28"></div>
                <div className="h-4 bg-gray-100 rounded w-28"></div>
                <div className="h-5 bg-gray-100 rounded-full w-24"></div>
                <div className="h-4 bg-gray-100 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function CalendarLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full flex bg-gray-50 animate-pulse">
      {/* Sidebar - hidden on mobile */}
      <div className="w-64 bg-white border-r border-gray-100 p-4 space-y-4 hidden lg:block">
        <div className="h-5 bg-gray-300 rounded w-24"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
      
      {/* Calendar */}
      <div className="flex-1 p-4">
        {/* Calendar header */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 bg-gray-300 rounded w-32"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        
        {/* Calendar grid */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="p-2 flex justify-center">
                <div className="h-4 bg-gray-300 rounded w-8"></div>
              </div>
            ))}
          </div>
          
          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 md:h-24 p-1 border-b border-r border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-6 mb-1"></div>
                {i % 5 === 0 && <div className="h-4 bg-blue-100 rounded w-full mb-1"></div>}
                {i % 8 === 2 && <div className="h-4 bg-green-100 rounded w-full"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

export function SettingsLoadingSkeleton() {
  return (
    <SkeletonLayout>
    <div className="h-full bg-gray-50 animate-pulse">
      <div className="max-w-4xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          {['General', 'Categories', 'Entity Fields', 'System'].map((_, i) => (
            <div key={i} className={`h-8 ${i === 0 ? 'bg-gray-400' : 'bg-gray-200'} rounded w-24`}></div>
          ))}
        </div>
        
        {/* Settings sections */}
        <div className="space-y-6">
          {[1, 2, 3].map((section) => (
            <div key={section} className="bg-white rounded-lg shadow-sm p-4">
              <div className="h-5 bg-gray-300 rounded w-32 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((field) => (
                  <div key={field} className="flex items-center gap-4">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                    <div className="h-9 bg-gray-100 rounded flex-1 max-w-md"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLayout>
  )
}

// Default export for backward compatibility
export default function PageLoadingSkeleton({ children }: { children?: ReactNode }) {
  return children || <TablePageLoadingSkeleton />
}