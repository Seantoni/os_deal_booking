import Link from 'next/link'

export default async function RejectedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const params = await searchParams
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border-2 border-red-200">
        {/* Reject Icon */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Solicitud No Aprobada
        </h1>
        
        <p className="text-gray-600 mb-6">
          La solicitud de booking ha sido rechazada. El estado se ha actualizado a "Rejected".
        </p>

        {params.id && (
          <p className="text-sm text-gray-500 mb-6">
            Request ID: {params.id}
          </p>
        )}

        {/* Action Button */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Gracias por su respuesta. El equipo de OfertaSimple ha sido notificado.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            OS Deals Booking - OfertaSimple
          </p>
        </div>
      </div>
    </div>
  )
}

