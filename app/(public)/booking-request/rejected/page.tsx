import RejectedBookingRequestForm from '@/components/booking/RejectedBookingRequestForm'
import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

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
      <PublicPageLayout title="Solicitud Rechazada">
        <div className="text-center">
          {/* Reject Icon */}
          <div className="mb-8 animate-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-[#ff3b30] rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          
          <p className="text-[#86868b] mb-8 leading-relaxed">
            La solicitud ha sido rechazada. Se ha enviado una notificación al equipo responsable.
          </p>

          <p className="text-sm text-[#1d1d1f] font-medium">
            Gracias por su respuesta.
          </p>
        </div>
      </PublicPageLayout>
    )
  }
  
  // If we have a token, show the form to collect rejection reason
  if (params.token) {
    return <RejectedBookingRequestForm token={params.token} />
  }

  // If we only have an ID (legacy), show success message
  return (
    <PublicPageLayout title="Solicitud No Aprobada">
      <div className="text-center">
        {/* Reject Icon */}
        <div className="mb-8 animate-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-[#ff3b30] rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        
        <p className="text-[#86868b] mb-8 leading-relaxed">
          La solicitud de booking ha sido rechazada.
        </p>

        {params.id && (
          <div className="bg-[#f5f5f7] rounded-lg p-2 mb-6 inline-block">
            <p className="text-xs text-[#86868b] font-mono">
              ID: {params.id}
            </p>
          </div>
        )}

        <p className="text-sm text-[#1d1d1f] font-medium">
          El equipo de OfertaSimple ha sido notificado.
        </p>
      </div>
    </PublicPageLayout>
  )
}
