export default function SettingsLoading() {
  return (
    <div className="h-full bg-gray-50 animate-pulse ml-0 md:ml-[86px] transition-all duration-300">
      <div className="max-w-4xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-8 ${i === 1 ? 'bg-gray-400' : 'bg-gray-200'} rounded w-24`}></div>
          ))}
        </div>
        
        {/* Settings sections */}
        <div className="space-y-6">
          {[1, 2, 3].map((section) => (
            <div key={section} className="bg-white rounded-lg shadow-sm p-4">
              <div className="h-5 bg-gray-300 rounded w-32 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((field) => (
                  <div key={field} className="flex items-center gap-4">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                    <div className="h-9 bg-gray-100 rounded flex-1 max-w-md"></div>
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
