export default function MarketingLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 ml-0 md:ml-[86px] transition-all duration-300">
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded skel" />
              <div className="h-5 rounded w-24 skel-strong" />
            </div>
            <div className="relative flex-1 max-w-xs">
              <div className="h-8 rounded-lg w-full skel" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-7 rounded-md ${i === 1 ? 'w-16 skel-strong' : 'w-20 skel'}`} style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-9 gap-2 px-4 py-2.5">
              {[14, 8, 8, 12, 6, 6, 10, 7].map((w, i) => (
                <div key={i} className={i === 0 ? 'col-span-2' : ''}>
                  <div className="h-3 rounded skel" style={{ width: `${w * 4}%`, animationDelay: `${i * 50}ms` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
              <div key={row} className="grid grid-cols-9 gap-2 px-4 py-3">
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full skel" style={{ animationDelay: `${row * 50}ms` }} />
                  <div className="h-3.5 rounded w-36 skel-strong" style={{ animationDelay: `${row * 50 + 20}ms` }} />
                </div>
                {[24, 14, 14, 4, 4, 4, 10].map((w, col) => (
                  <div key={col} className="flex items-center justify-center">
                    <div className={`h-3 rounded skel`} style={{ width: `${w * 3 - ((row * 3 + col * 7) % 4) * 2}%`, animationDelay: `${row * 50 + (col + 2) * 30}ms` }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
