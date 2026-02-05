import { getPublicLinkByToken } from '@/app/actions/booking'
import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

interface PublicBookingRequestConfirmationPageProps {
  searchParams: Promise<{ token?: string; requestId?: string }>
}

export default async function PublicBookingRequestConfirmationPage({
  searchParams,
}: PublicBookingRequestConfirmationPageProps) {
  const { token, requestId } = await searchParams

  let publicLink = null
  if (token) {
    publicLink = await getPublicLinkByToken(token)
  }

  return (
    <PublicPageLayout title="¡Solicitud Enviada!">
      <div className="text-center">
        <div className="mb-8 animate-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-[#34c759] rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <p className="text-[#86868b] mb-8 leading-relaxed">
          Su solicitud de booking ha sido recibida y está en revisión. La procesaremos en breve.
        </p>
        
        {requestId && (
          <div className="bg-[#f5f5f7] rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1">ID de Solicitud</p>
            <p className="text-[#1d1d1f] font-mono">{requestId}</p>
          </div>
        )}

        {publicLink?.bookingRequest && (
          <div className="bg-[#f5f5f7] rounded-xl p-5 mb-6 text-left">
            <p className="text-sm font-semibold text-[#1d1d1f] mb-3">Detalles de la Solicitud</p>
            <div className="space-y-2 text-sm text-[#86868b]">
              <div className="flex justify-between">
                <span className="font-medium text-[#1d1d1f]">Nombre:</span>
                <span>{publicLink.bookingRequest.name}</span>
              </div>
              {publicLink.bookingRequest.merchant && (
                <div className="flex justify-between">
                  <span className="font-medium text-[#1d1d1f]">Merchant:</span>
                  <span>{publicLink.bookingRequest.merchant}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-[#1d1d1f]">Estado:</span>
                <span className="text-[#34c759] font-medium">Aprobado</span>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-[#86868b]">
          Puede cerrar esta página ahora. La solicitud será revisada y procesada por nuestro equipo.
        </p>
      </div>
    </PublicPageLayout>
  )
}
