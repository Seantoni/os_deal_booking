'use client'

import CloseIcon from '@mui/icons-material/Close'
import { Button } from '@/components/ui'
import type { ReactNode } from 'react'

interface ModalShellProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'
  title?: string
  subtitle?: string
  icon?: ReactNode
  iconColor?: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'gray'
  headerActions?: ReactNode
  footer?: ReactNode
  hideBackdrop?: boolean
  backdropClassName?: string
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
}

const iconColorClasses = {
  blue: 'bg-blue-100 border-blue-200 text-blue-600',
  orange: 'bg-orange-100 border-orange-200 text-orange-600',
  green: 'bg-green-100 border-green-200 text-green-600',
  purple: 'bg-purple-100 border-purple-200 text-purple-600',
  red: 'bg-red-100 border-red-200 text-red-600',
  gray: 'bg-gray-100 border-gray-200 text-gray-600',
}

export default function ModalShell({
  isOpen,
  onClose,
  children,
  maxWidth = '4xl',
  title,
  subtitle,
  icon,
  iconColor = 'blue',
  headerActions,
  footer,
  hideBackdrop = false,
  backdropClassName,
}: ModalShellProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      {!hideBackdrop && (
        <div
          className={`fixed inset-0 bg-gray-900/20 z-40 transition-opacity ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${backdropClassName || ''}`}
          onClick={onClose}
        />
      )}

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal Panel */}
        <div
          className={`w-full ${maxWidthClasses[maxWidth]} bg-white shadow-2xl rounded-2xl flex flex-col max-h-[90vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header */}
          {(title || icon || headerActions) && (
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-start justify-between">
                {(title || icon || subtitle) && (
                  <div className="flex items-center gap-3">
                    {icon && (
                      <div className={`p-2 rounded-lg border ${iconColorClasses[iconColor]}`}>
                        {icon}
                      </div>
                    )}
                    {(title || subtitle) && (
                      <div>
                        {subtitle && (
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                            {subtitle}
                          </p>
                        )}
                        {title && (
                          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {headerActions}
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    className="p-2"
                    aria-label="Cerrar"
                  >
                    <CloseIcon fontSize="medium" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 bg-white px-6 py-4 sticky bottom-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Footer component for common button patterns
interface ModalFooterProps {
  onCancel?: () => void
  cancelLabel?: string
  submitLabel?: string
  submitLoading?: boolean
  submitDisabled?: boolean
  submitVariant?: 'primary' | 'success' | 'danger'
  additionalActions?: ReactNode
  leftContent?: ReactNode
}

export function ModalFooter({
  onCancel,
  cancelLabel = 'Cancelar',
  submitLabel,
  submitLoading = false,
  submitDisabled = false,
  submitVariant = 'primary',
  additionalActions,
  leftContent,
}: ModalFooterProps) {
  const submitButtonClass = {
    primary: '',
    success: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 disabled:bg-green-300',
    danger: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300',
  }[submitVariant]

  return (
    <div className="flex justify-between items-center">
      {leftContent && <div className="text-xs text-gray-500">{leftContent}</div>}
      <div className="flex gap-3 ml-auto">
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
        )}
        {additionalActions}
        {submitLabel && (
          <Button
            type="submit"
            form="modal-form"
            disabled={submitDisabled}
            loading={submitLoading}
            className={submitButtonClass}
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

ModalShell.Footer = ModalFooter

