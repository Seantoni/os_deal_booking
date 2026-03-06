import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

export default async function VendorReactivationSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; duplicate?: string }>
}) {
  const params = await searchParams
  const isDuplicate = params.duplicate === 'true'

  return (
    <PublicPageLayout title={isDuplicate ? 'Solicitud Ya Registrada' : 'Solicitud Recibida'}>
      <div className="text-center">
        <div className="mb-8 animate-in zoom-in duration-300">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
            isDuplicate
              ? 'bg-[#f59e0b] shadow-amber-500/20'
              : 'bg-[#34c759] shadow-green-500/20'
          }`}>
            {isDuplicate ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>

        <p className="text-[#86868b] mb-8 leading-relaxed">
          {isDuplicate
            ? 'Ya existe una solicitud abierta para este deal histórico. El equipo comercial la revisará y le dará seguimiento.'
            : 'Su solicitud fue recibida correctamente. El equipo comercial la revisará y continuará el proceso.'}
        </p>

        {params.id && (
          <div className="bg-[#f5f5f7] rounded-lg p-2 mb-6 inline-block">
            <p className="text-xs text-[#86868b] font-mono">
              ID: {params.id}
            </p>
          </div>
        )}

        <p className="text-sm text-[#1d1d1f] font-medium">
          Gracias por su respuesta.
        </p>
      </div>
    </PublicPageLayout>
  )
}
