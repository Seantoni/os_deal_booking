export default function ActivityLogLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 animate-pulse ml-0 md:ml-[86px] transition-all duration-300">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 bg-gray-100 rounded-lg w-56"></div>
          <div className="h-8 bg-gray-200 rounded-lg w-32"></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-1/4"></div>
              </div>
              <div className="h-4 bg-gray-100 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
