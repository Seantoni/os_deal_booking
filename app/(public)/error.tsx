'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'
import { PublicPageHeader } from '@/components/shared/public-pages/PublicPageHeader'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for public routes (booking forms, status pages, etc.)
 * Displays a user-friendly error message without requiring authentication
 */
export default function PublicError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error for debugging
    logger.error('Public route error:', error.message, error.digest)
    
    // Capture exception in Sentry with context
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'public',
        digest: error.digest,
      },
      extra: {
        digest: error.digest,
      },
    })
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header with Logo */}
        <PublicPageHeader />

        <div className="p-8 text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error inesperado
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Ha ocurrido un problema al cargar esta página. Por favor, intenta de nuevo.
          </p>

          {/* Error details (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-mono text-red-800 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Intentar de nuevo
            </button>
            
            <Link
              href="/"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Volver al inicio
            </Link>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-500 mt-6">
            OS Deals Booking - OfertaSimple
          </p>
        </div>
      </div>
    </div>
  )
}
