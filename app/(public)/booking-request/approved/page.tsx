import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

// This route is public; no auth required for viewing the approved page
export default function ApprovedBookingRequestsPage({
  searchParams,
}: {
  searchParams: { id?: string; approvedBy?: string }
}) {
  const params = searchParams
  return (
    <PublicPageLayout title="¡Solicitud Aprobada!">
      <div className="text-center">
        {/* Success Icon */}
        <div className="mb-8 animate-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-[#34c759] rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <p className="text-[#1d1d1f] text-lg mb-2 font-medium">
          Estado: <span className="text-[#34c759]">Pendiente de Agendar</span>
        </p>

        <p className="text-[#86868b] mb-8 leading-relaxed">
          La solicitud ha sido aprobada exitosamente. Recibirás una notificación una vez que el booking haya sido agendado.
        </p>

        {/* Approver Info Card */}
        {params.approvedBy && (
          <div className="bg-[#f5f5f7] rounded-xl p-5 mb-8 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1">
              Aprobado por
            </p>
            <p className="text-[#1d1d1f] font-medium break-all">
              {params.approvedBy}
            </p>
          </div>
        )}

        {/* Footer Note */}
        <div className="space-y-2">
          <p className="text-sm text-[#1d1d1f] font-medium">
            Gracias por su respuesta.
          </p>
          <p className="text-sm text-[#86868b]">
            El equipo de OfertaSimple ha sido notificado.
          </p>
        </div>
      </div>
    </PublicPageLayout>
  )
}
