export default function BookingRequestsLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 animate-pulse ml-0 md:ml-[86px] transition-all duration-300">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-blue-100 rounded w-32"></div>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`h-7 ${i === 1 ? 'bg-gray-300' : 'bg-gray-200'} rounded-full w-20 flex-shrink-0`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center gap-4 border-b border-gray-100">
            {['w-16', 'w-14', 'w-28', 'w-36', 'w-20', 'w-24', 'w-20', 'w-12'].map((w, i) => (
              <div key={i} className={`h-3 bg-gray-300 rounded ${w}`}></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
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
  )
}
