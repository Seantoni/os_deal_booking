export default function SettingsLoading() {
  return (
    <div className="h-full bg-gray-50 ml-0 md:ml-[86px] transition-all duration-300">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-8 rounded w-24 ${i === 1 ? 'skel-strong' : 'skel'}`} style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((section) => (
            <div key={section} className="bg-white rounded-lg shadow-sm p-4">
              <div className="h-5 rounded w-32 mb-4 skel-strong" style={{ animationDelay: `${section * 100}ms` }} />
              <div className="space-y-4">
                {[1, 2, 3].map((field) => (
                  <div key={field} className="flex items-center gap-4">
                    <div className="h-4 rounded w-28 skel" style={{ animationDelay: `${section * 100 + field * 50}ms` }} />
                    <div className="h-9 rounded flex-1 max-w-md skel" style={{ animationDelay: `${section * 100 + field * 50 + 30}ms` }} />
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
