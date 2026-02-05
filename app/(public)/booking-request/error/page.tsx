import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

// Public route: no auth required for error pages
export default async function BookingRequestsErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  
  return (
    <PublicPageLayout title="Error">
      <div className="text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 bg-[#86868b] rounded-full flex items-center justify-center shadow-lg shadow-gray-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        <p className="text-[#86868b] mb-8 leading-relaxed">
          {params.message || 'Ocurrió un error al procesar su solicitud.'}
        </p>

        {/* Action Button */}
        <div className="space-y-3">
          <p className="text-sm text-[#1d1d1f]">
            Por favor contacte al equipo de OfertaSimple si el problema persiste.
          </p>
        </div>
      </div>
    </PublicPageLayout>
  )
}
