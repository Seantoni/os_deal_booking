'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { rejectBookingRequestWithReason } from '@/app/actions/booking'
import { Textarea, Alert } from '@/components/ui'

interface RejectedBookingRequestFormProps {
  token: string
}

export default function RejectedBookingRequestForm({ token }: RejectedBookingRequestFormProps) {
  const router = useRouter()
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!rejectionReason.trim()) {
      setError('Por favor proporcione una razón para el rechazo')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await rejectBookingRequestWithReason(token, rejectionReason)
      
      if (result.success) {
        // Redirect to success page
        router.push('/booking-requests/rejected?success=true')
      } else {
        setError(result.error || 'Error al rechazar la solicitud')
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intente nuevamente.')
      console.error('Error rejecting request:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border-2 border-red-200">
        {/* Reject Icon */}
        <div className="mb-6 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Rechazar Solicitud
        </h1>
        
        <p className="text-gray-600 mb-6 text-center text-sm">
          Por favor proporcione una razón para rechazar esta solicitud de booking.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error">{error}</Alert>
          )}

          <Textarea
            id="rejectionReason"
            label="Razón del Rechazo *"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={5}
            required
            disabled={loading}
            placeholder="Ej: No cumple con los requisitos, fechas no disponibles, etc."
            className="border-red-300 focus:ring-red-500"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !rejectionReason.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : 'Confirmar Rechazo'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            OS Deals Booking - OfertaSimple
          </p>
        </div>
      </div>
    </div>
  )
}

