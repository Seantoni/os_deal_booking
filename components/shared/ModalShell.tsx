'use client'

import CloseIcon from '@mui/icons-material/Close'
import { useModalEscape } from '@/hooks/useModalEscape'
import { Button } from '@/components/ui'
import type { ReactNode } from 'react'

interface ModalShellProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl'
  title?: string
  subtitle?: string
  icon?: ReactNode
  iconColor?: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'gray'
  headerActions?: ReactNode
  footer?: ReactNode
  hideBackdrop?: boolean
  backdropClassName?: string
  autoHeight?: boolean // When true, modal adapts to content height instead of fixed 85vh
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
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
  autoHeight = false,
}: ModalShellProps) {
  // Close modal on Escape key
  useModalEscape(isOpen, onClose)
  
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - z-[60] to be above GlobalHeader (z-50) */}
      {!hideBackdrop && (
        <div
          className={`fixed inset-0 bg-gray-900/20 z-[60] transition-opacity ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${backdropClassName || ''}`}
          onClick={onClose}
        />
      )}

      {/* Modal Container - z-[70] to be above backdrop */}
      {/* Mobile: full screen, no padding. Desktop: centered with padding */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center md:p-3 pointer-events-none">
        {/* Modal Panel */}
        {/* Mobile: full height, no rounded corners. Desktop: 85vh max (or auto-height), rounded */}
        <div
          className={`w-full ${maxWidthClasses[maxWidth]} bg-white shadow-2xl md:rounded-xl flex flex-col ${
            autoHeight 
              ? 'h-full md:h-auto md:max-h-[85vh]' 
              : 'h-full md:h-[85vh]'
          } pointer-events-auto transform transition-all duration-300 overflow-hidden ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header - Compact */}
          {(title || icon || headerActions) && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {icon && (
                  <div className={`p-1.5 rounded-lg border ${iconColor === 'blue' ? 'border-blue-200' : iconColor === 'orange' ? 'border-orange-200' : iconColor === 'green' ? 'border-green-200' : iconColor === 'purple' ? 'border-purple-200' : iconColor === 'red' ? 'border-red-200' : 'border-gray-200'} ${iconColorClasses[iconColor]} flex-shrink-0`}>
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  {subtitle && (
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                      {subtitle}
                    </span>
                  )}
                  {title && (
                    <h2 className="text-sm font-bold text-gray-900 truncate leading-tight">{title}</h2>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {headerActions}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 transition-colors p-1"
                  aria-label="Cerrar"
                >
                  <CloseIcon style={{ fontSize: 20 }} />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className={autoHeight ? 'overflow-y-auto' : 'flex-1 overflow-y-auto'}>
            {children}
          </div>

          {/* Footer - Compact */}
          {footer && (
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex-shrink-0">
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
  hideSubmit?: boolean // Hide the submit button (for read-only modals)
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
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
      {leftContent && <div className="text-xs text-gray-500 hidden sm:block">{leftContent}</div>}
      <div className="flex items-center gap-2 sm:ml-auto flex-wrap justify-end">
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

