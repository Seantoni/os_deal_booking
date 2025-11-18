'use client'

import { useState, useRef } from 'react'
import { parsePDFForBooking, ParsedBookingData } from '@/app/actions/pdf-parse'

interface PDFUploadProps {
  onDataExtracted: (data: ParsedBookingData) => void
}

export default function PDFUpload({ onDataExtracted }: PDFUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const result = await parsePDFForBooking(file)

      if (result.success && result.data) {
        onDataExtracted(result.data)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setError(result.error || 'Failed to parse PDF')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setUploading(false)
    }
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  return (
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
        onClick={handleClick}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        title="Upload PDF to extract booking information"
      >
        {uploading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Parsing PDF...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Upload PDF</span>
          </>
        )}
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded shadow-lg z-50 max-w-xs">
          {error}
        </div>
      )}
    </div>
  )
}

