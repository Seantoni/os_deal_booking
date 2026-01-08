export default function ReservationsLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 animate-pulse ml-0 md:ml-[86px] transition-all duration-300">
      {/* Header */}
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
          <div className="bg-gray-50 px-4 py-2 flex items-center gap-4 border-b border-gray-200">
            {['w-40', 'w-24', 'w-24', 'w-20', 'w-20', 'w-16'].map((w, i) => (
              <div key={i} className={`h-3 bg-gray-300 rounded ${w}`}></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="px-4 py-2 flex items-center gap-4 border-b border-gray-100">
              <div className="flex flex-col gap-1 w-40">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-100 rounded w-24"></div>
              </div>
              <div className="h-5 bg-blue-100 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
