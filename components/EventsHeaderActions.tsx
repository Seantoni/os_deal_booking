'use client'

import { useState, useRef } from 'react'
import AddIcon from '@mui/icons-material/Add'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { parsePDFForBooking } from '@/app/actions/pdf-parse'
import type { ParsedBookingData } from '@/types'

interface EventsHeaderActionsProps {
  userRole: 'admin' | 'sales'
  onCreateEventClick?: () => void
  onPDFDataExtracted?: (data: ParsedBookingData) => void
}

export default function EventsHeaderActions({ userRole, onCreateEventClick, onPDFDataExtracted }: EventsHeaderActionsProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePDFExtracted = (data: ParsedBookingData) => {
    if (onPDFDataExtracted) {
      onPDFDataExtracted(data)
    } else {
      // Dispatch custom event if no callback provided
      window.dispatchEvent(new CustomEvent('pdfDataExtracted', { detail: data }))
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      setTimeout(() => setError(null), 3000)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const result = await parsePDFForBooking(file)

      if (result.success && result.data) {
        handlePDFExtracted(result.data)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setError(result.error || 'Failed to parse PDF')
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setTimeout(() => setError(null), 3000)
    } finally {
      setUploading(false)
    }
  }

  const handleCreateClick = () => {
    if (onCreateEventClick) {
      onCreateEventClick()
    } else {
      // Dispatch custom event if no callback provided
      window.dispatchEvent(new CustomEvent('openEventModal'))
    }
  }

  if (userRole !== 'admin') return null

  return (
    <div className="flex items-center gap-3">
      {/* Create Event Button */}
      <button
        onClick={handleCreateClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
      >
        <AddIcon fontSize="small" />
        <span>Create</span>
      </button>

      {/* Upload PDF Button */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <UploadFileIcon fontSize="small" />
              <span>Upload PDF</span>
            </>
          )}
        </button>

        {error && (
          <div className="absolute top-full right-0 mt-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded shadow-lg z-50 max-w-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

