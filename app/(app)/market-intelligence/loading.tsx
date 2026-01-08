export default function MarketIntelligenceLoading() {
  return (
    <div className="animate-pulse ml-0 md:ml-[86px] transition-all duration-300">
      <div className="p-4 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-blue-100 rounded"></div>
              <div className="h-6 bg-gray-200 rounded w-44"></div>
            </div>
            <div className="h-3 bg-gray-100 rounded w-64 mt-1.5"></div>
          </div>
          <div className="h-8 bg-blue-100 rounded w-32"></div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="h-8 bg-gray-100 rounded-md"></div>
            </div>
            {/* Source filter */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-100 rounded-md w-28"></div>
            </div>
            {/* Status filter */}
            <div className="h-8 bg-gray-100 rounded-md w-24"></div>
            {/* New checkbox */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-100 rounded w-20"></div>
            </div>
            {/* Charts toggle */}
            <div className="h-8 bg-gray-100 rounded w-28"></div>
          </div>
        </div>
        
        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Origen', 'Etiqueta', 'Oferta', 'Precio', 'Desc', 'Vendido', 'Días', '/Día', 'Hoy', 'Sem', 'Mes', 'Primera', 'Act.', ''].map((header, i) => (
                    <th key={i} className="px-3 py-2">
                      <div className={`h-3 bg-gray-200 rounded ${
                        i === 2 ? 'w-16' : i === 0 ? 'w-12' : 'w-10'
                      }`}></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                  <tr key={row} className="hover:bg-gray-50">
                    {/* Origen */}
                    <td className="px-3 py-2.5">
                      <div className="h-5 bg-orange-50 rounded w-20"></div>
                    </td>
                    {/* Etiqueta */}
                    <td className="px-3 py-2.5">
                      <div className="h-5 bg-green-50 rounded w-12"></div>
                    </td>
                    {/* Oferta */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0"></div>
                        <div className="min-w-0">
                          <div className="h-3 bg-gray-200 rounded w-32 mb-1"></div>
                          <div className="h-2.5 bg-gray-100 rounded w-40"></div>
                        </div>
                      </div>
                    </td>
                    {/* Precio */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="h-3 bg-green-100 rounded w-12 ml-auto mb-1"></div>
                      <div className="h-2.5 bg-gray-100 rounded w-10 ml-auto"></div>
                    </td>
                    {/* Descuento */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="h-5 bg-red-50 rounded w-10 ml-auto"></div>
                    </td>
                    {/* Vendido */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="h-3 bg-gray-200 rounded w-10 ml-auto"></div>
                    </td>
                    {/* Días */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="h-3 bg-gray-100 rounded w-6 ml-auto"></div>
                    </td>
                    {/* /Día */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="h-3 bg-indigo-50 rounded w-8 ml-auto"></div>
                    </td>
                    {/* Hoy */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="h-3 bg-gray-100 rounded w-6 ml-auto"></div>
                    </td>
                    {/* Semana */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="h-3 bg-gray-100 rounded w-8 ml-auto"></div>
                    </td>
                    {/* Mes */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="h-3 bg-gray-100 rounded w-6 ml-auto"></div>
                    </td>
                    {/* Primera Vez */}
                    <td className="px-3 py-2.5">
                      <div className="h-3 bg-gray-100 rounded w-16"></div>
                    </td>
                    {/* Actualizado */}
                    <td className="px-3 py-2.5">
                      <div className="h-3 bg-gray-100 rounded w-16"></div>
                    </td>
                    {/* Ver */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="h-4 w-4 bg-blue-50 rounded mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="h-3 bg-gray-200 rounded w-36"></div>
            <div className="flex items-center gap-2">
              <div className="h-6 bg-gray-200 rounded w-12"></div>
              <div className="h-3 bg-gray-100 rounded w-12"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
