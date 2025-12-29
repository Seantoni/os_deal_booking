import { getPublicLinkByToken } from '@/app/actions/booking'
import { formatDateShort } from '@/lib/date'
import { PublicPageHeader } from '@/components/shared/public-pages/PublicPageHeader'

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header with Logo */}
        <PublicPageHeader />

        <div className="p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Solicitud Enviada Exitosamente!
        </h1>
        <p className="text-gray-600 mb-6">
          Su solicitud de booking ha sido recibida y está en revisión. La procesaremos en breve.
        </p>
        
        {requestId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs font-semibold text-gray-700 mb-1">ID de Solicitud:</p>
            <p className="text-sm font-mono text-gray-900">{requestId}</p>
          </div>
        )}

        {publicLink?.bookingRequest && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-gray-900 mb-2">Detalles de la Solicitud:</p>
            <div className="space-y-1 text-sm text-gray-700">
              <p><span className="font-medium">Nombre:</span> {publicLink.bookingRequest.name}</p>
              {publicLink.bookingRequest.merchant && (
                <p><span className="font-medium">Merchant:</span> {publicLink.bookingRequest.merchant}</p>
              )}
              <p><span className="font-medium">Estado:</span> Aprobado</p>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500">
          Puede cerrar esta página ahora. La solicitud será revisada y procesada por nuestro equipo.
        </p>
        </div>
      </div>
    </div>
  )
}

