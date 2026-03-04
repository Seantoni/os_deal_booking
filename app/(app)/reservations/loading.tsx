export default function ReservationsLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 ml-0 md:ml-[86px] transition-all duration-300">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 rounded w-72 skel-strong" />
            <div className="h-4 rounded w-24 skel" style={{ animationDelay: '60ms' }} />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center gap-4 border-b border-gray-200">
            {[16, 10, 10, 8, 8, 7].map((w, i) => (
              <div key={i} className="h-3 rounded skel" style={{ width: `${w}%`, animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
            <div key={row} className="px-4 py-2 flex items-center gap-4 border-b border-gray-100">
              <div className="flex flex-col gap-1 w-40">
                <div className="h-3.5 rounded w-32 skel-strong" style={{ animationDelay: `${row * 50}ms` }} />
                <div className="h-3 rounded w-24 skel" style={{ animationDelay: `${row * 50 + 25}ms` }} />
              </div>
              {[10, 12, 10, 10, 8].map((w, col) => (
                <div key={col} className="h-3.5 rounded skel" style={{ width: `${w - ((row * 3 + col * 7) % 3)}%`, animationDelay: `${row * 50 + (col + 1) * 30}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
