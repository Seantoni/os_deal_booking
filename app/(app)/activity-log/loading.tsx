export default function ActivityLogLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 ml-0 md:ml-[86px] transition-all duration-300">
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 rounded-lg w-56 skel" />
          <div className="h-8 rounded-lg w-32 skel" style={{ animationDelay: '60ms' }} />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
              <div className="h-8 w-8 rounded-full skel" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded skel-strong" style={{ width: `${70 - (i % 4) * 8}%`, animationDelay: `${i * 50 + 20}ms` }} />
                <div className="h-3 rounded skel" style={{ width: '25%', animationDelay: `${i * 50 + 40}ms` }} />
              </div>
              <div className="h-3.5 rounded w-24 skel" style={{ animationDelay: `${i * 50 + 60}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
