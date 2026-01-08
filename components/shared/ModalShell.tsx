'use client'

import CloseIcon from '@mui/icons-material/Close'
import { useModalEscape } from '@/hooks/useModalEscape'
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
  blue: 'bg-blue-50 text-blue-600',
  orange: 'bg-orange-50 text-orange-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-50 text-gray-600',
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
  // Close modal on Escape key
  useModalEscape(isOpen, onClose)
  
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - z-[60] to be above GlobalHeader (z-50) */}
      {!hideBackdrop && (
        <div
          className={`fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[60] transition-opacity ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${backdropClassName || ''}`}
          onClick={onClose}
        />
      )}

      {/* Modal Container - z-[70] to be above backdrop */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        {/* Modal Panel */}
        <div
          className={`w-full ${maxWidthClasses[maxWidth]} bg-white shadow-xl rounded-lg flex flex-col max-h-[90vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header - Compact like EventModal */}
          {(title || icon || headerActions) && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 min-w-0">
                {icon && (
                  <div className={`p-1.5 rounded ${iconColorClasses[iconColor]} flex-shrink-0`}>
                    {icon}
                  </div>
                )}
                {subtitle && (
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex-shrink-0">
                    {subtitle}
                  </span>
                )}
                {title && (
                  <h2 className="text-base font-semibold text-gray-900 truncate">{title}</h2>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {headerActions}
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="p-1.5"
                  aria-label="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Footer - Compact like EventModal */}
          {footer && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sticky bottom-0">
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
  formId?: string // Custom form ID (default: 'modal-form')
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
  formId = 'modal-form',
}: ModalFooterProps) {
  const submitButtonClass = {
    primary: '',
    success: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 disabled:bg-green-300',
    danger: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300',
  }[submitVariant]

  return (
    <div className="flex justify-between items-center">
      {leftContent && <div className="text-xs text-gray-500">{leftContent}</div>}
      <div className="flex items-center gap-2 ml-auto">
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="ghost" size="sm">
            {cancelLabel}
          </Button>
        )}
        {additionalActions}
        {submitLabel && (
          <Button
            type="submit"
            form={formId}
            disabled={submitDisabled}
            loading={submitLoading}
            size="sm"
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

