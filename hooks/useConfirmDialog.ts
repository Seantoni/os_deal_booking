'use client'

import { useState, useCallback, type ReactNode } from 'react'

interface ConfirmDialogOptions {
  title?: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary' | 'success'
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmDialogOptions>({ message: '' })
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(options)
      setIsOpen(true)
      setResolvePromise(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(true)
      setResolvePromise(null)
    }
  }, [resolvePromise])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(false)
      setResolvePromise(null)
    }
  }, [resolvePromise])

  return {
    isOpen,
    options: {
      title: options.title || 'Confirmar Acción',
      message: options.message,
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      confirmVariant: options.confirmVariant || 'danger',
    },
    confirm,
    handleConfirm,
    handleCancel,
  }
}

