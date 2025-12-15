'use client'

import { useState, useEffect } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

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
      setError('Please provide a reason for why this opportunity was lost')
      return
    }

    onConfirm(reason.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-gray-900/30 z-[60]"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full z-[61]">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Opportunity Lost
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Please provide a reason why this opportunity was lost
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              disabled={loading}
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <ErrorOutlineIcon className="text-red-600 flex-shrink-0 mt-0.5" fontSize="small" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              rows={4}
              placeholder="Enter the reason why this opportunity was lost..."
              required
              disabled={loading}
              className="block w-full px-3 py-2 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              This information will help improve future opportunities
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Confirm Lost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

