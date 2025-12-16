import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Public route: no auth required for cancelled notification
export default async function CancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const params = await searchParams

  // Fetch booking request to get details
  let requestName: string | null = null
  let cancelledBy: string | null = null
  let cancelledAt: Date | null = null
  
  if (params.id) {
    try {
      const bookingRequest = await prisma.bookingRequest.findUnique({
        where: { id: params.id },
        select: { name: true, processedBy: true, processedAt: true },
      })
      requestName = bookingRequest?.name || null
      cancelledBy = bookingRequest?.processedBy || null
      cancelledAt = bookingRequest?.processedAt || null
    } catch (error) {
      logger.error('Error fetching booking request:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border-2 border-orange-200">
        {/* Header with Logo */}
        <div style={{ 
          backgroundColor: '#ea580c', 
          padding: '20px', 
          borderRadius: '8px 8px 0 0' 
        }}>
          <img 
            src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2075.png?_t=1743086513" 
            alt="OfertaSimple Logo" 
            width="120" 
            style={{ display: 'block', margin: '0 auto', border: '0', height: 'auto', outline: 'none', textDecoration: 'none' }} 
          />
          <p className="text-sm text-white text-center mt-2">OS Deals Booking - OfertaSimple</p>
        </div>
        
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Solicitud Cancelada
          </h1>
          
          {/* Message */}
          <div className="space-y-4">
            <p className="text-gray-600">
              Esta solicitud de booking ha sido <span className="font-semibold text-orange-700">cancelada</span> por el equipo de OfertaSimple.
            </p>
            
            {requestName && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <p className="text-sm text-orange-800">
                  <strong>Solicitud:</strong> <span className="font-mono text-orange-900">{requestName}</span>
                </p>
              </div>
            )}

            {cancelledAt && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-700">
                  <strong>Fecha de cancelación:</strong>{' '}
                  {new Date(cancelledAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
              <p className="text-sm text-orange-800">
                <strong>¿Qué significa esto?</strong>
              </p>
              <ul className="mt-2 text-sm text-orange-700 list-disc list-inside space-y-1">
                <li>La solicitud fue cancelada antes de ser procesada</li>
                <li>No es posible aprobar o rechazar esta solicitud</li>
                <li>Si tienes preguntas, por favor contáctanos</li>
              </ul>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="text-left">
                <p className="text-sm text-blue-800 font-medium">¿Necesitas ayuda?</p>
                <p className="text-sm text-blue-700 mt-1">
                  Si tienes alguna pregunta sobre esta cancelación o deseas enviar una nueva solicitud, 
                  puedes contactarnos en{' '}
                  <a 
                    href="mailto:soporte@ofertasimple.com" 
                    className="font-medium underline hover:text-blue-900"
                  >
                    soporte@ofertasimple.com
                  </a>
                </p>
              </div>
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
          <p className="text-xs text-gray-500 text-center">
            OS Deals Booking - OfertaSimple
          </p>
        </div>
      </div>
    </div>
  )
}

