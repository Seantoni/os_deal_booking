import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Public route: no auth required for already-processed notification
export default async function AlreadyProcessedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; id?: string }>
}) {
  const params = await searchParams
  const status = params.status || 'processed'
  const isApproved = status === 'approved'
  const isRejected = status === 'rejected'

  // Fetch booking request to get processedBy email
  let processedByEmail: string | null = null
  if (params.id) {
    try {
      const bookingRequest = await prisma.bookingRequest.findUnique({
        where: { id: params.id },
        select: { processedBy: true },
      })
      processedByEmail = bookingRequest?.processedBy || null
    } catch (error) {
      logger.error('Error fetching booking request:', error)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${
      isApproved 
        ? 'bg-gradient-to-br from-blue-50 to-indigo-50' 
        : isRejected
        ? 'bg-gradient-to-br from-red-50 to-rose-50'
        : 'bg-gradient-to-br from-gray-50 to-slate-50'
    }`}>
      <div className={`max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
        isApproved 
          ? 'border-blue-200' 
          : isRejected 
          ? 'border-red-200'
          : 'border-gray-200'
      }`}>
        {/* Header with Logo */}
        <div style={{ 
          backgroundColor: isApproved ? '#2563eb' : isRejected ? '#dc2626' : '#6b7280', 
          padding: '20px', 
          borderRadius: '8px 8px 0 0' 
        }}>
          <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2075.png?_t=1743086513" alt="OfertaSimple Logo" width="120" style={{ display: 'block', margin: '0 auto', border: '0', height: 'auto', outline: 'none', textDecoration: 'none' }} />
          <p className="text-sm text-white mt-2">OS Deals Booking - OfertaSimple</p>
        </div>
        
        <div className="p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
            isApproved 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
              : isRejected
              ? 'bg-gradient-to-br from-red-500 to-red-600'
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
          }`}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Solicitud Ya Procesada
        </h1>
        
        {/* Message based on status */}
        {isApproved && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Esta solicitud de booking ya ha sido <span className="font-semibold text-blue-700">aprobada</span>.
            </p>
            {processedByEmail && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-sm text-blue-800">
                  <strong>Aprobada por:</strong> <span className="font-mono text-blue-900">{processedByEmail}</span>
                </p>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-800">
                <strong>¿Qué significa esto?</strong>
              </p>
              <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>La solicitud fue aprobada anteriormente</li>
                <li>No es posible cambiar su estado nuevamente</li>
                <li>El equipo de OfertaSimple ya fue notificado</li>
              </ul>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Esta solicitud de booking ya ha sido <span className="font-semibold text-red-700">rechazada</span>.
            </p>
            {processedByEmail && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-sm text-red-800">
                  <strong>Rechazada por:</strong> <span className="font-mono text-red-900">{processedByEmail}</span>
                </p>
              </div>
            )}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
              <p className="text-sm text-red-800">
                <strong>¿Qué significa esto?</strong>
              </p>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                <li>La solicitud fue rechazada anteriormente</li>
                <li>No es posible cambiar su estado nuevamente</li>
                <li>El equipo de OfertaSimple ya fue notificado</li>
              </ul>
            </div>
          </div>
        )}

        {!isApproved && !isRejected && (
          <p className="text-gray-600">
            Esta solicitud de booking ya ha sido procesada y no puede ser modificada.
          </p>
        )}

        {/* Important Notice */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-800 text-left">
              <strong>Nota:</strong> Cada solicitud solo puede ser aprobada o rechazada una vez. 
              Si necesita realizar cambios, por favor contacte al equipo de OfertaSimple directamente.
            </p>
          </div>
        </div>

        {/* Request ID */}
        {params.id && (
          <p className="mt-4 text-xs text-gray-500">
            ID de solicitud: {params.id}
          </p>
        )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 px-8 pb-8">
          <p className="text-xs text-gray-500">
            OS Deals Booking - OfertaSimple
          </p>
        </div>
      </div>
    </div>
  )
}

