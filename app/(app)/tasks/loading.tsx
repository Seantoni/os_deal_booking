export default function TasksLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 ml-0 md:ml-[86px] transition-all duration-300">
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="h-7 rounded w-48 skel-strong" />
            <div className="h-8 rounded w-28 skel" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-6 rounded-full w-20 flex-shrink-0 ${i === 1 ? 'skel-strong' : 'skel'}`} style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center gap-4 border-b border-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 rounded w-24 skel" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <div key={row} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
              {[18, 14, 22, 16, 12].map((w, col) => (
                <div key={col} className={`h-3.5 rounded ${col === 0 ? 'skel-strong' : 'skel'}`} style={{ width: `${w - ((row * 3 + col * 7) % 4) * 2}%`, animationDelay: `${row * 50 + col * 30}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
