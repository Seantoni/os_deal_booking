'use client'

import { useState, useTransition } from 'react'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import RepeatIcon from '@mui/icons-material/Repeat'
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'
import { Button } from '@/components/ui'
import { requestReassignment, type ReassignmentType } from '@/app/actions/assignments'
import toast from 'react-hot-toast'
import { useModalEscape } from '@/hooks/useModalEscape'

interface ReassignmentModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  businessName: string
  onSuccess?: () => void
}

const REASSIGNMENT_OPTIONS: Array<{
  value: ReassignmentType
  label: string
  description: string
  icon: React.ReactNode
  color: string
}> = [
  {
    value: 'reasignar',
    label: 'Reasignar',
    description: 'Este negocio necesita ser asignado a otro vendedor',
    icon: <SwapHorizIcon style={{ fontSize: 24 }} />,
    color: 'blue',
  },
  {
    value: 'sacar',
    label: 'Sacar',
    description: 'Este negocio debe ser removido de mi cartera',
    icon: <PersonRemoveIcon style={{ fontSize: 24 }} />,
    color: 'orange',
  },
  {
    value: 'recurrente',
    label: 'Recurrente',
    description: 'Este negocio es recurrente y necesita revisión de asignación',
    icon: <RepeatIcon style={{ fontSize: 24 }} />,
    color: 'purple',
  },
]

export default function ReassignmentModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  onSuccess,
}: ReassignmentModalProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedType, setSelectedType] = useState<ReassignmentType | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Close modal on Escape key
  useModalEscape(isOpen, onClose)

  const handleSave = () => {
    if (!selectedType) {
      setError('Por favor selecciona una opción')
      return
    }

    if (!reason.trim()) {
      setError('La razón es requerida')
      return
    }

    if (reason.trim().length < 10) {
      setError('La razón debe tener al menos 10 caracteres')
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await requestReassignment(businessId, selectedType, reason.trim())
      
      if (result.success) {
        const successMessages: Record<ReassignmentType, string> = {
          reasignar: `Solicitud de reasignación enviada para ${businessName}`,
          sacar: `Solicitud para sacar ${businessName} enviada`,
          recurrente: `Solicitud de negocio recurrente enviada para ${businessName}`,
        }
        toast.success(successMessages[selectedType])
        onSuccess?.()
        handleClose()
      } else {
        toast.error(result.error || 'Error al enviar la solicitud')
      }
    })
  }

  const handleClose = () => {
    setSelectedType(null)
    setReason('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <AssignmentReturnIcon />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Acción</h3>
              <p className="text-sm text-gray-500 truncate max-w-[280px]">{businessName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">
            Selecciona la acción que deseas realizar con este negocio. Un administrador revisará tu solicitud.
          </p>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {REASSIGNMENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedType(option.value)
                  setError(null)
                }}
                className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-all text-left ${
                  selectedType === option.value
                    ? option.color === 'blue'
                      ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm'
                      : option.color === 'purple'
                      ? 'border-purple-400 bg-purple-50 text-purple-700 shadow-sm'
                      : 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className={
                  selectedType === option.value
                    ? option.color === 'blue' 
                      ? 'text-blue-500' 
                      : option.color === 'purple'
                      ? 'text-purple-500'
                      : 'text-orange-500'
                    : 'text-gray-400'
                }>
                  {option.icon}
                </span>
                <div>
                  <span className="font-medium block">{option.label}</span>
                  <span className="text-sm text-gray-500">{option.description}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Reason textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razón <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError(null)
              }}
              placeholder="Explica brevemente por qué solicitas esta acción..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Mínimo 10 caracteres
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !selectedType || !reason.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {isPending ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </div>
      </div>
    </div>
  )
}
