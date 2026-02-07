'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'
import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

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
    <PublicPageLayout title="Error inesperado">
      <div className="text-center">
        {/* Error Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#ff3b30] shadow-lg shadow-red-500/20 mb-6">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Message */}
        <p className="text-[#86868b] mb-6 leading-relaxed">
          Ha ocurrido un problema al cargar esta página. Por favor, intenta de nuevo.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-[#fff5f5] border border-[#ff3b30]/20 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-mono text-[#ff3b30] break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-[#ff3b30]/80 mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-[#e84c0f] hover:bg-[#c2410c] text-white font-semibold py-3 px-4 rounded-full transition-colors text-sm"
          >
            Intentar de nuevo
          </button>
          
          <Link
            href="/"
            className="block w-full bg-[#f5f5f7] hover:bg-[#e5e5e5] text-[#1d1d1f] font-semibold py-3 px-4 rounded-full transition-colors text-sm"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </PublicPageLayout>
  )
}
