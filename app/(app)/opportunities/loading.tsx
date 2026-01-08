export default function OpportunitiesLoading() {
  const columnColors = ['border-gray-300', 'border-blue-300', 'border-yellow-300', 'border-purple-300', 'border-green-300', 'border-red-300']
  
  return (
    <div className="h-full flex flex-col bg-gray-50 animate-pulse ml-0 md:ml-[86px] transition-all duration-300">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex p-0.5 bg-gray-100 rounded-md">
                <div className="h-6 w-6 bg-white rounded shadow-sm"></div>
                <div className="h-6 w-6 bg-transparent rounded"></div>
              </div>
              <div className="h-8 bg-gray-100 rounded-lg w-56"></div>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`h-7 ${i === 1 ? 'bg-gray-200' : 'bg-gray-100'} rounded-full w-24 flex-shrink-0`}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 h-full min-w-max px-1">
          {[0, 1, 2, 3, 4, 5].map((colIndex) => (
            <div 
              key={colIndex} 
              className={`w-72 flex-shrink-0 bg-gray-100/50 rounded-lg border-t-2 ${columnColors[colIndex]}`}
            >
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                  <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                </div>
              </div>
              <div className="p-2 space-y-2">
                {Array.from({ length: colIndex === 0 ? 4 : colIndex === 1 ? 3 : 2 }).map((_, cardIndex) => (
                  <div key={cardIndex} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
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
    </div>
  )
}
