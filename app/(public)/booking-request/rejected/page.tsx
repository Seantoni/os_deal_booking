import RejectedBookingRequestForm from '@/components/booking/RejectedBookingRequestForm'

// Public route: no auth required
export default function RejectedBookingRequestsPage({
  searchParams,
}: {
  searchParams: { id?: string; token?: string; success?: string }
}) {
  const params = searchParams
  
  // If success, show success message
  if (params.success === 'true') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Brand Header */}
          <div style={{ backgroundColor: '#dc2626', padding: '20px', borderRadius: '8px 8px 0 0', margin: '-1px -1px 0 -1px' }}>
            <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2075.png?_t=1743086513" alt="OfertaSimple Logo" width="120" style={{ display: 'block', margin: '0 auto', border: '0', height: 'auto', outline: 'none', textDecoration: 'none' }} />
            <h1 className="text-2xl font-bold text-white mt-3 mb-1">Solicitud Rechazada</h1>
            <p className="text-sm text-red-100">OS Deals Booking - OfertaSimple</p>
          </div>

          <div className="p-8 text-center">
            {/* Reject Icon */}
            <div className="mb-6 animate-in zoom-in duration-300">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            
            <p className="text-gray-500 mb-8 leading-relaxed">
              La solicitud ha sido rechazada. Se ha enviado una notificación al equipo responsable.
            </p>

            {/* Action Button */}
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">
                Gracias por su respuesta.
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
  
  // If we have a token, show the form to collect rejection reason
  if (params.token) {
    return <RejectedBookingRequestForm token={params.token} />
  }

  // If we only have an ID (legacy), show success message
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-white border-b border-gray-100 p-6 text-center">
          <h2 className="text-xl font-extrabold text-[#e84c0f] tracking-tight">
            OfertaSimple
          </h2>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
            OS Deals Booking
          </p>
        </div>

        <div className="p-8 text-center">
          {/* Reject Icon */}
          <div className="mb-6 animate-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Solicitud No Aprobada
          </h1>
          
          <p className="text-gray-500 mb-8 leading-relaxed">
            La solicitud de booking ha sido rechazada.
          </p>

          {params.id && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 mb-6 inline-block">
              <p className="text-xs text-gray-400 font-mono">
                ID: {params.id}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-medium">
              El equipo de OfertaSimple ha sido notificado.
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

