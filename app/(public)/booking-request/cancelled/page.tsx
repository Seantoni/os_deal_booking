import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

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
    <PublicPageLayout title="Solicitud Cancelada">
      <div className="text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-[#ff9500] shadow-orange-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>
        
        {/* Message */}
        <div className="space-y-6">
          <p className="text-[#86868b] text-lg">
            Esta solicitud de booking ha sido <span className="font-semibold text-[#ff9500]">cancelada</span> por el equipo de OfertaSimple.
          </p>
          
          {requestName && (
            <div className="bg-[#f5f5f7] rounded-xl p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1">
                Solicitud
              </p>
              <p className="text-[#1d1d1f] font-medium break-all">
                {requestName}
              </p>
            </div>
          )}

          {cancelledAt && (
            <div className="bg-[#f5f5f7] rounded-xl p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1">
                Fecha de cancelación
              </p>
              <p className="text-[#1d1d1f] font-medium">
                {new Date(cancelledAt).toLocaleDateString('es-ES', {
                  timeZone: PANAMA_TIMEZONE,
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          <div className="bg-[#f5f5f7] rounded-xl p-5 text-left">
            <p className="text-sm font-semibold text-[#1d1d1f] mb-2">
              ¿Qué significa esto?
            </p>
            <ul className="text-sm text-[#86868b] list-disc list-inside space-y-1">
              <li>La solicitud fue cancelada antes de ser procesada</li>
              <li>No es posible aprobar o rechazar esta solicitud</li>
              <li>Si tienes preguntas, por favor contáctanos</li>
            </ul>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 bg-[#f0f9ff] border border-[#007aff]/20 rounded-xl p-4 text-left">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#007aff] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#007aff] mb-1">¿Necesitas ayuda?</p>
              <p className="text-sm text-[#86868b]">
                Si tienes alguna pregunta sobre esta cancelación o deseas enviar una nueva solicitud, 
                puedes contactarnos en{' '}
                <a 
                  href="mailto:soporte@ofertasimple.com" 
                  className="font-medium text-[#007aff] underline hover:text-[#0056b3]"
                >
                  soporte@ofertasimple.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Request ID */}
        {params.id && (
          <p className="mt-6 text-xs text-[#86868b] font-mono">
            ID: {params.id}
          </p>
        )}
      </div>
    </PublicPageLayout>
  )
}
