import { PublicPageHeader } from '@/components/shared/public-pages/PublicPageHeader'

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
        <PublicPageHeader />
        <div className="bg-white pt-6 pb-2 px-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">¡Solicitud Aprobada!</h1>
        </div>

        <div className="p-8 text-center pt-2">
          {/* Success Icon */}
          <div className="mb-6 animate-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <p className="text-gray-500 mb-8 leading-relaxed">
            La solicitud de booking ha sido aprobada exitosamente y ahora se encuentra en estado <strong>Pendiente de Agendar</strong>.
          </p>

          <p className="text-gray-500 mb-8 leading-relaxed">
            Recibirás una notificación una vez que el booking haya sido agendado.
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
