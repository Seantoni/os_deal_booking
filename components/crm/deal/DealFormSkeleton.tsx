'use client'

export default function DealFormSkeleton() {
  return (
    <div className="p-3 space-y-3 animate-pulse">
      {/* Pipeline skeleton */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-6 w-24 rounded-full bg-gray-200" />
            {i < 4 && <div className="h-px w-3 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Booking summary row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-3 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-14 bg-gray-200 rounded-full" />
        <div className="h-4 w-20 bg-gray-200 rounded-full" />
      </div>

      {/* Responsible section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="h-3 w-48 bg-gray-200 rounded" />
        </div>
        <div className="p-3 space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="flex-1 h-8 bg-gray-200 rounded" />
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-40 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
