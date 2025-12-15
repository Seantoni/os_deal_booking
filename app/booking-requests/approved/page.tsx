// This route is public; no auth required for viewing the approved page
export default function ApprovedBookingRequestsPage({
  searchParams,
}: {
  searchParams: { id?: string; approvedBy?: string }
}) {
  const params = searchParams
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border-2 border-green-200">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          ¡Solicitud Aprobada!
        </h1>
        
        <p className="text-gray-600 mb-4">
          La solicitud de booking ha sido aprobada exitosamente. El estado se ha actualizado a "Approved".
        </p>

        {/* Approver Info */}
        {params.approvedBy && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              <span className="font-medium">Aprobado por:</span>
              <br />
              <span className="text-green-700">{params.approvedBy}</span>
            </p>
          </div>
        )}

        {params.id && (
          <p className="text-xs text-gray-400 mb-6">
            ID: {params.id}
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
