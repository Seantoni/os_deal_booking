interface TableSkeletonProps {
  rows?: number
  columns?: number
  showCheckbox?: boolean
  columnWidths?: string[]
  showHeader?: boolean
  showSearch?: boolean
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 5,
  showCheckbox = false,
  columnWidths = [],
  showHeader = true,
  showSearch = true,
}: TableSkeletonProps) {
  // Default column widths if not provided
  const defaultWidths = [
    'w-32', 'w-24', 'w-20', 'w-28', 'w-16', 'w-24', 'w-20', 
    'w-28', 'w-24', 'w-20', 'w-32', 'w-24', 'w-20', 'w-16'
  ]
  const widths = columnWidths.length > 0 
    ? columnWidths 
    : defaultWidths.slice(0, columns)

  return (
    <div className="animate-pulse">
      {showHeader && (
        <>
          {/* Search bar skeleton */}
          {showSearch && (
            <div className="h-9 bg-gray-100 rounded-lg w-full max-w-xs mb-4"></div>
          )}
        </>
      )}
      
      {/* Table skeleton */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="bg-gray-50/80 px-4 py-3 flex gap-4">
          {showCheckbox && (
            <div className="h-4 bg-gray-200 rounded w-4 flex-shrink-0"></div>
          )}
          {Array.from({ length: columns }).map((_, i) => (
            <div 
              key={i} 
              className={`h-3 bg-gray-200 rounded ${widths[i] || 'w-24'}`}
            ></div>
          ))}
          <div className="h-3 bg-gray-200 rounded w-8 flex-shrink-0 ml-auto"></div>
        </div>
        
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 items-center">
            {showCheckbox && (
              <div className="h-4 w-4 bg-gray-100 rounded flex-shrink-0"></div>
            )}
            {Array.from({ length: columns }).map((_, j) => (
              <div 
                key={j} 
                className={`h-4 bg-gray-100 rounded ${widths[j] || 'w-24'}`}
              ></div>
            ))}
            <div className="h-4 bg-gray-100 rounded w-8 flex-shrink-0 ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Page-specific skeleton configurations
// Note: These match the actual table column counts (excluding actions column which is added automatically)

export function BookingRequestsSkeleton({ rows = 8 }: { rows?: number }) {
  // Booking Requests: Status, Source, Name, Email, Category, Dates, Created, Days, Sent, Processed, Rejection Reason + checkbox + actions
  return (
    <TableSkeleton
      rows={rows}
      columns={11}
      showCheckbox={true}
      columnWidths={['w-20', 'w-16', 'w-32', 'w-40', 'w-24', 'w-28', 'w-24', 'w-20', 'w-20', 'w-24', 'w-32']}
    />
  )
}

export function DealsSkeleton({ rows = 8 }: { rows?: number }) {
  // Deals: Business Name, Date Range, Opp. Responsible, Editor, ERE, Booked, Status + actions
  return (
    <TableSkeleton
      rows={rows}
      columns={7}
      columnWidths={['w-40', 'w-32', 'w-28', 'w-24', 'w-24', 'w-24', 'w-20']}
    />
  )
}

export function OpportunitiesSkeleton({ rows = 8 }: { rows?: number }) {
  // Opportunities: Business, Stage, Start, Close, Notes + actions
  return (
    <TableSkeleton
      rows={rows}
      columns={5}
      columnWidths={['w-40', 'w-28', 'w-24', 'w-24', 'w-32']}
    />
  )
}

export function BusinessesSkeleton({ rows = 8 }: { rows?: number }) {
  // Businesses: Business Name, Contact, Email/Phone, Category, Reps, Opp. + actions
  return (
    <TableSkeleton
      rows={rows}
      columns={6}
      columnWidths={['w-40', 'w-32', 'w-40', 'w-32', 'w-24', 'w-12']}
    />
  )
}

export function LeadsSkeleton({ rows = 8 }: { rows?: number }) {
  // Leads: Business Name, Contact, Email/Phone, Category, Responsible, Stage, Source + actions
  return (
    <TableSkeleton
      rows={rows}
      columns={7}
      columnWidths={['w-40', 'w-32', 'w-40', 'w-32', 'w-28', 'w-24', 'w-20']}
    />
  )
}

export function CalendarSkeleton() {
  return (
    <div className="animate-pulse flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-gray-100 p-4 space-y-4 hidden lg:block">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
      
      {/* Calendar skeleton */}
      <div className="flex-1 p-4">
        {/* Calendar header */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-10"></div>
            <div className="h-10 bg-gray-200 rounded w-10"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`header-${i}`} className="h-8 bg-gray-100 rounded flex items-center justify-center">
              <div className="h-4 bg-gray-300 rounded w-8"></div>
            </div>
          ))}
          
          {/* Calendar cells */}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={`cell-${i}`} className="h-24 bg-gray-50 rounded border border-gray-100 p-1">
              <div className="h-4 bg-gray-200 rounded w-6 mb-1"></div>
              {i % 5 === 0 && <div className="h-4 bg-blue-100 rounded w-full"></div>}
              {i % 7 === 2 && <div className="h-4 bg-green-100 rounded w-full mt-1"></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="animate-pulse p-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      
      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="flex gap-2 pt-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ModalLoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  )
}

