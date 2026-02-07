import Link from 'next/link'
import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

interface PublicBookingRequestErrorPageProps {
  searchParams: Promise<{ reason?: string }>
}

export default async function PublicBookingRequestErrorPage({ searchParams }: PublicBookingRequestErrorPageProps) {
  const { reason } = await searchParams

  const getErrorMessage = () => {
    switch (reason) {
      case 'invalid_link':
        return {
          title: 'Enlace Inválido',
          message: 'El enlace de solicitud de booking es inválido o ha expirado.',
        }
      case 'link_already_used':
        return {
          title: 'Enlace Ya Utilizado',
          message: 'Este enlace de solicitud de booking ya ha sido utilizado. Cada enlace solo puede usarse una vez.',
        }
      default:
        return {
          title: 'Error',
          message: 'Ocurrió un error al acceder al formulario de solicitud de booking.',
        }
    }
  }

  const error = getErrorMessage()

  return (
    <PublicPageLayout title={error.title}>
      <div className="text-center">
        <div className="mb-8 animate-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-[#ff3b30] rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        
        <p className="text-[#86868b] mb-8 leading-relaxed">
          {error.message}
        </p>
        
        <p className="text-sm text-[#1d1d1f] font-medium">
          Por favor contacte a la persona que le envió este enlace para obtener asistencia.
        </p>
      </div>
    </PublicPageLayout>
  )
}
