'use client'

import { useEffect } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import WarningIcon from '@mui/icons-material/Warning'
import { Button } from '@/components/ui'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmButtonClass = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop - light gray to match other modals */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                confirmVariant === 'danger' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                <WarningIcon
                  className={`h-6 w-6 ${
                    confirmVariant === 'danger' ? 'text-red-600' : 'text-blue-600'
                  }`}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <Button
              onClick={onCancel}
              variant="ghost"
              className="p-1.5"
            >
              <CloseIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-500">{message}</p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <Button
              onClick={onCancel}
              variant="secondary"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              variant={confirmVariant === 'danger' ? 'destructive' : 'primary'}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

