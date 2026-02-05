import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

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

  // Fetch booking request to get processedBy name
  let processedByName: string | null = null
  if (params.id) {
    try {
      const bookingRequest = await prisma.bookingRequest.findUnique({
        where: { id: params.id },
        select: { processedBy: true },
      })
      
      // Look up the user profile to get the actual name
      if (bookingRequest?.processedBy) {
        // Check if it's an admin override (starts with "Admin:")
        if (bookingRequest.processedBy.startsWith('Admin:')) {
          processedByName = bookingRequest.processedBy
        } else {
          // Look up user profile by clerkId
          const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: bookingRequest.processedBy },
            select: { name: true, email: true },
          })
          processedByName = userProfile?.name || userProfile?.email || bookingRequest.processedBy
        }
      }
    } catch (error) {
      logger.error('Error fetching booking request:', error)
    }
  }

  return (
    <PublicPageLayout title="Solicitud Ya Procesada">
      <div className="text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
            isApproved 
              ? 'bg-[#34c759] shadow-green-500/20' 
              : isRejected
              ? 'bg-[#ff3b30] shadow-red-500/20'
              : 'bg-[#86868b] shadow-gray-500/20'
          }`}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        {/* Message based on status */}
        {isApproved && (
          <div className="space-y-6">
            <p className="text-[#86868b] text-lg">
              Esta solicitud de booking ya ha sido <span className="font-semibold text-[#34c759]">aprobada</span>.
            </p>
            
            {processedByName && (
              <div className="bg-[#f5f5f7] rounded-xl p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1">
                  {processedByName.startsWith('Admin:') ? 'Aprobada internamente por' : 'Aprobada por'}
                </p>
                <p className="text-[#1d1d1f] font-medium break-all">
                  {processedByName.replace('Admin: ', '')}
                </p>
              </div>
            )}

            <div className="bg-[#f5f5f7] rounded-xl p-5 text-left">
              <p className="text-sm font-semibold text-[#1d1d1f] mb-2">
                ¿Qué significa esto?
              </p>
              <ul className="text-sm text-[#86868b] list-disc list-inside space-y-1">
                <li>La solicitud fue aprobada anteriormente</li>
                <li>No es posible cambiar su estado nuevamente</li>
                <li>El equipo de OfertaSimple ya fue notificado</li>
              </ul>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="space-y-6">
            <p className="text-[#86868b] text-lg">
              Esta solicitud de booking ya ha sido <span className="font-semibold text-[#ff3b30]">rechazada</span>.
            </p>
            
            {processedByName && (
              <div className="bg-[#f5f5f7] rounded-xl p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1">
                  Rechazada por
                </p>
                <p className="text-[#1d1d1f] font-medium break-all">
                  {processedByName}
                </p>
              </div>
            )}

            <div className="bg-[#f5f5f7] rounded-xl p-5 text-left">
              <p className="text-sm font-semibold text-[#1d1d1f] mb-2">
                ¿Qué significa esto?
              </p>
              <ul className="text-sm text-[#86868b] list-disc list-inside space-y-1">
                <li>La solicitud fue rechazada anteriormente</li>
                <li>No es posible cambiar su estado nuevamente</li>
                <li>El equipo de OfertaSimple ya fue notificado</li>
              </ul>
            </div>
          </div>
        )}

        {!isApproved && !isRejected && (
          <p className="text-[#86868b] text-lg">
            Esta solicitud de booking ya ha sido procesada y no puede ser modificada.
          </p>
        )}

        {/* Important Notice */}
        <div className="mt-8 bg-[#fff9e6] rounded-xl p-4 text-left border border-[#ffcc00]/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-[#86868b]">
              <strong className="text-[#1d1d1f]">Nota:</strong> Cada solicitud solo puede ser aprobada o rechazada una vez. 
              Si necesita realizar cambios, por favor contacte al equipo de OfertaSimple directamente.
            </p>
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
