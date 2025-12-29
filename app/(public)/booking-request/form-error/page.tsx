import Link from 'next/link'
import { PublicPageHeader } from '@/components/shared/public-pages/PublicPageHeader'

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden text-center">
        {/* Header with Logo */}
        <PublicPageHeader />

        <div className="p-8">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{error.title}</h1>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <p className="text-sm text-gray-500">
          Por favor contacte a la persona que le envió este enlace para obtener asistencia.
        </p>
        </div>
      </div>
    </div>
  )
}

