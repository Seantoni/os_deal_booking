'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for authenticated app routes
 * Catches errors in route segments and displays a recovery UI
 */
export default function AppError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error for debugging
    logger.error('App route error:', error.message, error.digest)
    
    // In production, this would send to error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-5">
            <svg
              className="h-7 w-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Algo salió mal
          </h2>

          {/* Message */}
          <p className="text-gray-600 text-center mb-4 text-sm">
            Ha ocurrido un error inesperado. Puedes intentar de nuevo o volver al inicio.
          </p>

          {/* Error details (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
              <p className="text-xs font-mono text-gray-700 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 mt-1">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              Intentar de nuevo
            </button>
            <a
              href="/dashboard"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm text-center"
            >
              Ir al Dashboard
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Si el problema persiste, contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  )
}
