'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary - catches errors in root layout
 * This is the last line of defense for uncaught errors.
 * 
 * Note: This component must define its own <html> and <body> tags
 * because it replaces the root layout when triggered.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error - using console directly since this is the global handler
    // and we want to ensure errors are always logged even if our logger fails
    console.error('[GLOBAL ERROR]', error.message, error.digest)
    
    // Capture exception in Sentry - critical errors at root level
    Sentry.captureException(error, {
      level: 'fatal',
      tags: {
        errorBoundary: 'global',
        digest: error.digest,
      },
      extra: {
        digest: error.digest,
        isCritical: true,
      },
    })
  }, [error])

  return (
    <html lang="es">
      <body style={{ 
        margin: 0, 
        fontFamily: 'Arial, Helvetica, sans-serif',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            maxWidth: '400px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: '#dc2626',
              padding: '24px',
              textAlign: 'center'
            }}>
              <svg
                style={{ width: '48px', height: '48px', color: 'white', margin: '0 auto' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h1 style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                marginTop: '12px',
                marginBottom: 0
              }}>
                Error Crítico
              </h1>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{
                color: '#4b5563',
                fontSize: '14px',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}>
                Ha ocurrido un error inesperado en la aplicación. 
                Esto no debería pasar, por favor intenta recargar la página.
              </p>

              {/* Error details (always show for debugging critical errors) */}
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <p style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#991b1b',
                  margin: 0,
                  wordBreak: 'break-all'
                }}>
                  {error.message || 'Unknown error'}
                </p>
                {error.digest && (
                  <p style={{
                    fontSize: '11px',
                    color: '#b91c1c',
                    marginTop: '8px',
                    marginBottom: 0
                  }}>
                    ID: {error.digest}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={reset}
                  style={{
                    width: '100%',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontWeight: '600',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  Intentar de nuevo
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  style={{
                    width: '100%',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    fontWeight: '600',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Ir al inicio
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '12px 24px',
              borderTop: '1px solid #f3f4f6'
            }}>
              <p style={{
                fontSize: '11px',
                color: '#9ca3af',
                textAlign: 'center',
                margin: 0
              }}>
                Si el problema persiste, contacta al administrador del sistema.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
