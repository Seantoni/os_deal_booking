'use client'

import { useEffect, type ReactNode } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Button } from '@/components/ui'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary' | 'success'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  loadingText?: string
  /** Optional custom icon to display in the header */
  icon?: ReactNode
  /** Optional z-index override (default: 50) */
  zIndex?: number
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
  loadingText,
  icon,
  zIndex = 50,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when dialog is open
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        // Restore original value (or remove if it was empty)
        document.body.style.overflow = originalOverflow || ''
      }
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel, loading])

  if (!isOpen) return null

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (confirmVariant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          defaultIcon: <WarningIcon className="h-6 w-6 text-red-600" />,
        }
      case 'success':
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          defaultIcon: <CheckCircleOutlineIcon className="h-6 w-6 text-green-600" />,
        }
      case 'primary':
      default:
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          defaultIcon: <InfoOutlinedIcon className="h-6 w-6 text-blue-600" />,
        }
    }
  }

  const variantStyles = getVariantStyles()

  // Map variant to Button variant
  const getButtonVariant = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'destructive' as const
      case 'success':
        return 'primary' as const // Using primary with green styling
      case 'primary':
      default:
        return 'primary' as const
    }
  }

  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      {/* Backdrop - needs explicit z-index to layer correctly */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        style={{ zIndex }}
        onClick={() => !loading && onCancel()}
      />

      {/* Dialog - needs higher z-index than backdrop */}
      <div className="fixed inset-0 flex min-h-full items-center justify-center p-2 sm:p-4" style={{ zIndex: zIndex + 1 }}>
        <div className="relative flex w-full max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] transform flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
          {/* Close button */}
          <div className="absolute top-3 right-3">
            <Button
              onClick={onCancel}
              variant="ghost"
              className="p-1.5"
              disabled={loading}
              aria-label="Cerrar"
            >
              <CloseIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Header */}
          <div className="flex flex-col items-center px-5 pt-6 pb-2 text-center sm:px-6 flex-shrink-0">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${variantStyles.iconBg} mb-3`}>
              {icon || variantStyles.defaultIcon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-center sm:px-6">
            {typeof message === 'string' ? (
              <p className="text-sm text-gray-600">{message}</p>
            ) : (
              message
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse justify-center gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:gap-3 sm:px-6 flex-shrink-0">
            {cancelText && (
              <Button
                type="button"
                onClick={onCancel}
                variant="secondary"
                disabled={loading}
              >
                {cancelText}
              </Button>
            )}
            {confirmText && (
              <Button
                type="button"
                onClick={onConfirm}
                variant={getButtonVariant()}
                disabled={loading}
                className={confirmVariant === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {loadingText || confirmText}
                  </span>
                ) : (
                  confirmText
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
