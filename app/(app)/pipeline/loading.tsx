export default function PipelineLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 ml-0 md:ml-[86px] transition-all duration-300">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-4">
          <div className="h-8 rounded w-full max-w-md skel" />
          <div className="flex gap-6 border-b border-gray-200 -mb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-4 rounded w-28 pb-3 ${i === 1 ? 'skel-strong' : 'skel'}`} style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center gap-4 border-b border-gray-100">
            {[14, 10, 12, 12, 10, 14].map((w, i) => (
              <div key={i} className="h-3 rounded skel" style={{ width: `${w}%`, animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <div key={row} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50">
              {[16, 10, 12, 12, 10, 14].map((w, col) => (
                <div key={col} className={`h-3.5 rounded ${col === 0 ? 'skel-strong' : 'skel'}`} style={{ width: `${w - ((row * 3 + col * 9) % 5)}%`, animationDelay: `${row * 50 + col * 30}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
