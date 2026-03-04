export default function MarketIntelligenceLoading() {
  return (
    <div className="ml-0 md:ml-[86px] transition-all duration-300">
      <div className="p-4 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded skel" />
              <div className="h-6 rounded w-44 skel-strong" />
            </div>
            <div className="h-3 rounded w-64 mt-1.5 skel" style={{ animationDelay: '60ms' }} />
          </div>
          <div className="h-8 rounded w-32 skel" style={{ animationDelay: '100ms' }} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="h-8 rounded-md skel" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded skel" />
              <div className="h-8 rounded-md w-28 skel" style={{ animationDelay: '80ms' }} />
            </div>
            <div className="h-8 rounded-md w-24 skel" style={{ animationDelay: '120ms' }} />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded skel" style={{ animationDelay: '160ms' }} />
              <div className="h-3 rounded w-20 skel" style={{ animationDelay: '180ms' }} />
            </div>
            <div className="h-8 rounded w-28 skel" style={{ animationDelay: '200ms' }} />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[12, 10, 16, 8, 8, 8, 6, 8, 6, 8, 6, 10, 10, 4].map((w, i) => (
                    <th key={i} className="px-3 py-2">
                      <div className="h-3 rounded skel" style={{ width: `${w * 5}%`, animationDelay: `${i * 40}ms` }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                  <tr key={row}>
                    <td className="px-3 py-2.5"><div className="h-5 rounded w-20 skel" style={{ animationDelay: `${row * 50}ms` }} /></td>
                    <td className="px-3 py-2.5"><div className="h-5 rounded w-12 skel" style={{ animationDelay: `${row * 50 + 30}ms` }} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded flex-shrink-0 skel" style={{ animationDelay: `${row * 50 + 50}ms` }} />
                        <div className="min-w-0 space-y-1">
                          <div className="h-3 rounded w-32 skel-strong" style={{ animationDelay: `${row * 50 + 60}ms` }} />
                          <div className="h-2.5 rounded w-40 skel" style={{ animationDelay: `${row * 50 + 70}ms` }} />
                        </div>
                      </div>
                    </td>
                    {[12, 10, 10, 6, 8, 6, 8, 6, 16, 16].map((w, col) => (
                      <td key={col} className="px-3 py-2.5">
                        <div className={`h-3 rounded ${col < 2 ? 'ml-auto' : ''} skel`} style={{ width: `${w * 4 - ((row * 3 + col * 7) % 4) * 3}%`, animationDelay: `${row * 50 + (col + 3) * 25}ms` }} />
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center"><div className="h-4 w-4 rounded mx-auto skel" style={{ animationDelay: `${row * 50 + 300}ms` }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="h-3 rounded w-36 skel" />
            <div className="flex items-center gap-2">
              <div className="h-6 rounded w-12 skel" />
              <div className="h-3 rounded w-12 skel" style={{ animationDelay: '50ms' }} />
              <div className="h-6 rounded w-12 skel" style={{ animationDelay: '100ms' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
