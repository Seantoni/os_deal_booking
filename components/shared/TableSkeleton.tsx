interface TableSkeletonProps {
  rows?: number
  columns?: number[]
  mobileCards?: number
}

/**
 * Shimmer-animated skeleton that previews a table (desktop) + card list (mobile).
 * `columns` is an array of approximate percentage widths for each header/cell.
 */
export default function TableSkeleton({
  rows = 8,
  columns = [14, 18, 12, 16, 10, 8],
  mobileCards = 5,
}: TableSkeletonProps) {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Desktop: table rows */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
          {columns.map((w, i) => (
            <div
              key={i}
              className="h-2.5 rounded skel"
              style={{ width: `${w}%`, animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
            {columns.map((w, c) => {
              const jitter = ((r * 7 + c * 13) % 5) * 3
              return (
                <div
                  key={c}
                  className={`h-3 rounded ${c === 0 ? 'skel-strong' : 'skel'}`}
                  style={{ width: `${Math.max(6, w - jitter)}%`, animationDelay: `${r * 50 + c * 30}ms` }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2 px-4 pt-2">
        {Array.from({ length: mobileCards }, (_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div
                className="h-4 rounded skel-strong"
                style={{ width: `${48 - i * 5}%`, animationDelay: `${i * 80}ms` }}
              />
              <div
                className="h-5 w-14 rounded-full skel"
                style={{ animationDelay: `${i * 80 + 30}ms` }}
              />
            </div>
            <div
              className="h-3 rounded skel"
              style={{ width: `${72 - i * 6}%`, animationDelay: `${i * 80 + 50}ms` }}
            />
            <div className="flex items-center gap-3">
              <div
                className="h-2.5 w-16 rounded skel"
                style={{ animationDelay: `${i * 80 + 70}ms` }}
              />
              <div
                className="h-2.5 w-12 rounded skel"
                style={{ animationDelay: `${i * 80 + 90}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
