// This route is public; no auth required for viewing the approved page
export default function ApprovedBookingRequestsPage({
  searchParams,
}: {
  searchParams: { id?: string; approvedBy?: string }
}) {
  const params = searchParams
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Brand Header */}
        <div style={{ backgroundColor: '#e84c0f', padding: '20px', borderRadius: '8px 8px 0 0', margin: '-1px -1px 0 -1px' }}>
          <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2075.png?_t=1743086513" alt="OfertaSimple Logo" width="120" style={{ display: 'block', margin: '0 auto', border: '0', height: 'auto', outline: 'none', textDecoration: 'none' }} />
          <h1 className="text-2xl font-bold text-white mt-3 mb-1">¡Solicitud Aprobada!</h1>
          <p className="text-sm text-orange-100">OS Deals Booking - OfertaSimple</p>
        </div>

        <div className="p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6 animate-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <p className="text-gray-500 mb-8 leading-relaxed">
            La solicitud de booking ha sido confirmada exitosamente. El proceso continuará automáticamente.
          </p>

          {/* Approver Info Card */}
          {params.approvedBy && (
            <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 mb-8">
              <p className="text-sm text-green-800">
                <span className="font-semibold block mb-1 uppercase text-xs tracking-wider text-green-600">Aprobado por</span>
                <span className="font-medium text-green-900 break-all">{params.approvedBy}</span>
              </p>
            </div>
          )}

          {/* Footer Note */}
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-medium">
              Gracias por su respuesta.
              <br />
              <span className="font-normal text-gray-400">El equipo de OfertaSimple ha sido notificado.</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">
            © {new Date().getFullYear()} OfertaSimple · Panamá
          </p>
        </div>
      </div>
    </div>
  )
}

