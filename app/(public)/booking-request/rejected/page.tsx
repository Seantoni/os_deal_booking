import RejectedBookingRequestForm from '@/components/booking/RejectedBookingRequestForm'
import { PublicPageHeader } from '@/components/shared/public-pages/PublicPageHeader'

// Public route: no auth required
export default async function RejectedBookingRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string; success?: string }>
}) {
  const params = await searchParams
  
  // If success, show success message
  if (params.success === 'true') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Brand Header */}
          <PublicPageHeader />
          <div className="bg-white pt-6 pb-2 px-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Solicitud Rechazada</h1>
          </div>

          <div className="p-8 text-center pt-2">
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
        <PublicPageHeader />
        <div className="bg-white pt-6 pb-2 px-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Solicitud No Aprobada</h1>
        </div>

        <div className="p-8 text-center pt-2">
          {/* Reject Icon */}
          <div className="mb-6 animate-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          
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

