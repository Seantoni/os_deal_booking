'use client'

import { useState, useEffect } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'

interface LostReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  currentReason?: string | null
  loading?: boolean
}

export default function LostReasonModal({
  isOpen,
  onClose,
  onConfirm,
  currentReason,
  loading = false,
}: LostReasonModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setReason(currentReason || '')
      setError('')
    }
  }, [isOpen, currentReason])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Por favor proporcione una razón por la cual esta oportunidad se perdió')
      return
    }

    onConfirm(reason.trim())
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Oportunidad Perdida"
      subtitle="Por favor proporcione una razón por la cual esta oportunidad se perdió"
      iconColor="red"
      maxWidth="md"
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelLabel="Cancelar"
          submitLabel={loading ? 'Guardando...' : 'Confirmar Perdida'}
          submitLoading={loading}
          submitDisabled={loading || !reason.trim()}
          submitVariant="danger"
        />
      }
    >
      <form id="modal-form" onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <ErrorOutlineIcon className="text-red-600 flex-shrink-0 mt-0.5" fontSize="small" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razón <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              rows={4}
              placeholder="Ingrese la razón por la cual esta oportunidad se perdió..."
              required
              disabled={loading}
              className="block w-full px-3 py-2 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Esta información ayudará a mejorar futuras oportunidades
            </p>
          </div>

      </form>
    </ModalShell>
  )
}

