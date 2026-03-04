export default function EventsLoading() {
  return (
    <div className="h-full flex bg-gray-50 ml-0 md:ml-[86px] transition-all duration-300">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-100 p-4 space-y-4 hidden lg:block">
        <div className="h-5 rounded w-24 skel-strong" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-8 rounded skel" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
      {/* Calendar */}
      <div className="flex-1 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 rounded w-32 skel-strong" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded skel" style={{ animationDelay: '50ms' }} />
            <div className="h-8 w-8 rounded skel" style={{ animationDelay: '100ms' }} />
            <div className="h-8 rounded w-20 skel" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="p-2 flex justify-center">
                <div className="h-4 rounded w-8 skel" style={{ animationDelay: `${i * 40}ms` }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 md:h-24 p-1 border-b border-r border-gray-100">
                <div className="h-4 rounded w-6 mb-1 skel" style={{ animationDelay: `${(i % 7) * 40 + Math.floor(i / 7) * 60}ms` }} />
                {i % 5 === 0 && <div className="h-4 rounded w-full mb-1 skel" style={{ animationDelay: `${i * 20}ms` }} />}
                {i % 8 === 2 && <div className="h-4 rounded w-full skel" style={{ animationDelay: `${i * 20 + 30}ms` }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
