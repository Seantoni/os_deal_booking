export default function MarketingLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 animate-pulse ml-0 md:ml-[86px] transition-all duration-300">
      {/* Header - matches EntityPageHeader */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Title + Search */}
          <div className="flex items-center gap-4 flex-1">
            {/* Title */}
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-orange-100 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-24"></div>
            </div>
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <div className="h-8 bg-gray-100 rounded-lg w-full"></div>
            </div>
          </div>
          
          {/* Filter tabs */}
          <div className="flex items-center gap-1">
            {['Todos', 'Activos', 'En Progreso', 'Completados', 'Omitidos'].map((_, i) => (
              <div 
                key={i} 
                className={`h-7 rounded-md ${i === 0 ? 'bg-orange-100 w-16' : 'bg-gray-100 w-20'}`}
              ></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content - Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-9 gap-2 px-4 py-2.5">
              <div className="col-span-2"><div className="h-3 bg-gray-200 rounded w-28"></div></div>
              <div><div className="h-3 bg-gray-200 rounded w-16"></div></div>
              <div><div className="h-3 bg-gray-200 rounded w-16"></div></div>
              <div><div className="h-3 bg-gray-200 rounded w-24"></div></div>
              <div className="text-center"><div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div></div>
              <div className="text-center"><div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div></div>
              <div className="text-center"><div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div></div>
              <div className="text-center"><div className="h-3 bg-gray-200 rounded w-14 mx-auto"></div></div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
              <div key={row} className="grid grid-cols-9 gap-2 px-4 py-3 hover:bg-gray-50">
                {/* Business Name */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-36"></div>
                </div>
                
                {/* Category */}
                <div className="flex items-center">
                  <div className="h-3 bg-gray-100 rounded w-24"></div>
                </div>
                
                {/* Booked Date */}
                <div className="flex items-center">
                  <div className="h-3 bg-gray-100 rounded w-14"></div>
                </div>
                
                {/* Run At Date */}
                <div className="flex items-center">
                  <div className="h-3 bg-gray-100 rounded w-14"></div>
                </div>
                
                {/* Instagram */}
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 bg-gray-100 rounded"></div>
                </div>
                
                {/* TikTok */}
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 bg-gray-100 rounded"></div>
                </div>
                
                {/* OfertaSimple */}
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 bg-gray-100 rounded"></div>
                </div>
                
                {/* Progress + Actions */}
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-blue-50 rounded-full w-10"></div>
                  <div className="h-6 bg-gray-100 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
