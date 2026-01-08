export default function TasksLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 animate-pulse ml-0 md:ml-[86px] transition-all duration-300">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="h-7 bg-gray-200 rounded w-48"></div>
            <div className="h-8 bg-blue-100 rounded w-28"></div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-6 ${i === 1 ? 'bg-gray-400' : 'bg-gray-200'} rounded-full w-20 flex-shrink-0`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center gap-4 border-b border-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 bg-gray-300 rounded w-24"></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <div key={row} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
              {[1, 2, 3, 4, 5].map((col) => (
                <div key={col} className="h-4 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
