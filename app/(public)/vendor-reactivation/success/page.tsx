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

        {isDuplicate ? (
          <p className="text-[#86868b] mb-8 leading-relaxed">
            Ya existe una solicitud abierta para este deal. Nuestro equipo está trabajando en ella y le notificaremos cuando esté lista.
          </p>
        ) : (
          <>
            <p className="text-[#86868b] mb-6 leading-relaxed">
              ¡Excelente decisión! Su solicitud fue recibida correctamente.
            </p>
            <div className="text-left max-w-sm mx-auto mb-8 space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#34c759] text-white text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                <p className="text-sm text-[#86868b] leading-relaxed">
                  <strong className="text-[#1d1d1f]">Recibimos su solicitud</strong> — ya está en nuestro sistema.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f5f5f7] text-[#86868b] text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                <p className="text-sm text-[#86868b] leading-relaxed">
                  <strong className="text-[#1d1d1f]">Nuestro equipo la revisará</strong> — validamos los detalles y preparamos la oferta.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f5f5f7] text-[#86868b] text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                <p className="text-sm text-[#86868b] leading-relaxed">
                  <strong className="text-[#1d1d1f]">Le notificaremos por correo</strong> — recibirá noticias pronto con los próximos pasos.
                </p>
              </div>
            </div>
          </>
        )}

        <p className="text-sm text-[#1d1d1f] font-medium">
          Gracias por confiar en OfertaSimple.
        </p>
      </div>
    </PublicPageLayout>
  )
}
