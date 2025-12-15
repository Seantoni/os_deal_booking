'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface ActionResult<T> {
  success: boolean
  error?: string
  data?: T
}

interface UseAsyncActionOptions<T> {
  /** Toast message on success */
  successMessage?: string
  /** Toast message on error (overrides result.error) */
  errorMessage?: string
  /** Callback on success */
  onSuccess?: (data?: T) => void
  /** Callback on error */
  onError?: (error: string) => void
  /** Show toast notifications (default: true) */
  showToast?: boolean
}

interface UseAsyncActionReturn<T> {
  /** Whether the action is currently executing */
  loading: boolean
  /** Error message from the last action */
  error: string
  /** Execute an async action with standardized error handling */
  execute: <R = T>(
    action: () => Promise<ActionResult<R>>,
    options?: UseAsyncActionOptions<R>
  ) => Promise<R | undefined>
  /** Clear the current error */
  clearError: () => void
  /** Manually set an error */
  setError: (error: string) => void
}

/**
 * Hook for standardized async action handling with loading state, error handling, and toast notifications.
 * 
 * @example
 * ```tsx
 * const { loading, error, execute } = useAsyncAction()
 * 
 * const handleSubmit = async () => {
 *   const data = await execute(
 *     () => createBusiness(formData),
 *     { 
 *       successMessage: 'Business created!',
 *       onSuccess: (business) => onClose()
 *     }
 *   )
 * }
 * ```
 */
export function useAsyncAction<T = unknown>(): UseAsyncActionReturn<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const clearError = useCallback(() => setError(''), [])

  const execute = useCallback(async <R = T>(
    action: () => Promise<ActionResult<R>>,
    options?: UseAsyncActionOptions<R>
  ): Promise<R | undefined> => {
    const {
      successMessage,
      errorMessage,
      onSuccess,
      onError,
      showToast = true,
    } = options || {}

    setLoading(true)
    setError('')

    try {
      const result = await action()

      if (result.success) {
        if (showToast && successMessage) {
          toast.success(successMessage)
        }
        onSuccess?.(result.data)
        return result.data
      } else {
        const errMsg = errorMessage || result.error || 'An error occurred'
        setError(errMsg)
        if (showToast) {
          toast.error(errMsg)
        }
        onError?.(errMsg)
        return undefined
      }
    } catch (e) {
      const errMsg = errorMessage || (e instanceof Error ? e.message : 'An unexpected error occurred')
      setError(errMsg)
      if (showToast) {
        toast.error(errMsg)
      }
      onError?.(errMsg)
      return undefined
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    execute,
    clearError,
    setError,
  }
}

/**
 * Hook for multiple concurrent async actions with individual loading states
 * 
 * @example
 * ```tsx
 * const actions = useMultipleAsyncActions()
 * 
 * // Each action has its own loading state
 * await actions.execute('save', () => saveData())
 * await actions.execute('delete', () => deleteData())
 * 
 * // Check loading states
 * actions.isLoading('save') // true/false
 * actions.isAnyLoading() // true if any action is loading
 * ```
 */
export function useMultipleAsyncActions() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const execute = useCallback(async <T>(
    actionId: string,
    action: () => Promise<ActionResult<T>>,
    options?: UseAsyncActionOptions<T>
  ): Promise<T | undefined> => {
    const {
      successMessage,
      errorMessage,
      onSuccess,
      onError,
      showToast = true,
    } = options || {}

    setLoadingStates(prev => ({ ...prev, [actionId]: true }))
    setErrors(prev => ({ ...prev, [actionId]: '' }))

    try {
      const result = await action()

      if (result.success) {
        if (showToast && successMessage) {
          toast.success(successMessage)
        }
        onSuccess?.(result.data)
        return result.data
      } else {
        const errMsg = errorMessage || result.error || 'An error occurred'
        setErrors(prev => ({ ...prev, [actionId]: errMsg }))
        if (showToast) {
          toast.error(errMsg)
        }
        onError?.(errMsg)
        return undefined
      }
    } catch (e) {
      const errMsg = errorMessage || (e instanceof Error ? e.message : 'An unexpected error occurred')
      setErrors(prev => ({ ...prev, [actionId]: errMsg }))
      if (showToast) {
        toast.error(errMsg)
      }
      onError?.(errMsg)
      return undefined
    } finally {
      setLoadingStates(prev => ({ ...prev, [actionId]: false }))
    }
  }, [])

  const isLoading = useCallback((actionId: string) => loadingStates[actionId] || false, [loadingStates])
  const isAnyLoading = useCallback(() => Object.values(loadingStates).some(Boolean), [loadingStates])
  const getError = useCallback((actionId: string) => errors[actionId] || '', [errors])
  const clearError = useCallback((actionId: string) => {
    setErrors(prev => ({ ...prev, [actionId]: '' }))
  }, [])
  const clearAllErrors = useCallback(() => setErrors({}), [])

  return {
    execute,
    isLoading,
    isAnyLoading,
    getError,
    clearError,
    clearAllErrors,
    loadingStates,
    errors,
  }
}

