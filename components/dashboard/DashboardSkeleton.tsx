'use client'

/**
 * Dashboard Loading Skeleton
 * 
 * Matches the new dashboard layout structure
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="animate-pulse">
          {/* Header Row Skeleton */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-44 bg-gray-200 rounded-lg"></div>
              <div className="h-9 w-56 bg-gray-200 rounded-lg"></div>
              <div className="h-9 w-9 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-8 w-32 bg-gray-100 rounded-lg"></div>
          </div>
          
          {/* Priority Row Skeleton (Por Reservar + Inbox) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
              <div className="p-4 space-y-3">
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
              </div>
              <div className="p-4 space-y-3">
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Stats Row Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="h-7 w-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          
          {/* Main Content Skeleton (Leaderboard + Request Flow) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                <div className="h-4 w-28 bg-gray-200 rounded"></div>
              </div>
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="h-4 w-36 bg-gray-200 rounded"></div>
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                    <div className="h-2 w-24 bg-gray-100 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

