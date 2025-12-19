'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateAndSendPublicLink } from '@/app/actions/booking'
import CloseIcon from '@mui/icons-material/Close'
import EmailIcon from '@mui/icons-material/Email'
import EditIcon from '@mui/icons-material/Edit'
import LinkIcon from '@mui/icons-material/Link'
import AddIcon from '@mui/icons-material/Add'
import toast from 'react-hot-toast'

interface NewRequestModalProps {
  isOpen: boolean
  onClose: () => void
  queryParams?: Record<string, string> // Optional query params for pre-filling (e.g., from opportunity)
}

export default function NewRequestModal({ isOpen, onClose, queryParams }: NewRequestModalProps) {
  const router = useRouter()
  const [emails, setEmails] = useState<string[]>(['']) // Array of emails
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [sentEmails, setSentEmails] = useState<string[]>([])

  // React 19: useTransition for non-blocking UI during form actions
  const [isPending, startTransition] = useTransition()
  const isGenerating = isPending

  if (!isOpen) return null

  const handleInternalForm = () => {
    let url = '/booking-requests/new'
    const params = new URLSearchParams()
    
    // Add existing query params (e.g., from opportunity)
    if (queryParams && Object.keys(queryParams).length > 0) {
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value)
      })
    }
    
    // Add emails from the modal if any were entered
    const validEmails = emails.filter(e => e && e.includes('@'))
    if (validEmails.length > 0) {
      // First email becomes the primary email (partnerEmail)
      params.append('partnerEmail', validEmails[0])
      // Remaining emails become additional emails
      if (validEmails.length > 1) {
        params.append('additionalEmails', JSON.stringify(validEmails.slice(1)))
      }
    }
    
    if (params.toString()) {
      url = `${url}?${params.toString()}`
    }
    router.push(url)
    onClose()
  }

  // React 19: Generate link handler using useTransition
  const handleGenerateLink = () => {
    // Filter valid emails
    const validEmails = emails.filter(e => e && e.includes('@'))
    
    if (validEmails.length === 0) {
      setError('Please enter at least one valid email address')
      return
    }

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const result = await generateAndSendPublicLink(validEmails)
        
        if (result.success && result.data) {
          setSuccess(true)
          setGeneratedUrl(result.data.url)
          setSentEmails(validEmails)
          setEmails(['']) // Clear email fields
        } else {
          setError(result.error || 'Failed to generate link')
        }
      } catch (err) {
        console.error('Error generating link:', err)
        setError('An unexpected error occurred')
      }
    })
  }

  const addEmailField = () => {
    setEmails([...emails, ''])
  }

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index))
    }
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
    setError(null)
  }

  const hasValidEmail = emails.some(e => e && e.includes('@'))

  const handleCopyLink = async () => {
    if (generatedUrl) {
      try {
        await navigator.clipboard.writeText(generatedUrl)
        toast.success('Link copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy link:', err)
        toast.error('Failed to copy link')
      }
    }
  }

  const handleClose = () => {
    setEmails([''])
    setError(null)
    setSuccess(false)
    setGeneratedUrl(null)
    setSentEmails([])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Booking Request</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!success ? (
            <>
              <p className="text-xs text-gray-600 mb-3">
                Choose how you want to create the booking request:
              </p>

              {/* Option 1: Internal Form */}
              <button
                onClick={handleInternalForm}
                className="w-full flex items-start gap-2 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                  <EditIcon className="text-blue-600" fontSize="small" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Create Internal Form</h3>
                  <p className="text-xs text-gray-600">
                    Fill out the booking request form yourself with all details.
                  </p>
                </div>
              </button>

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* Option 2: Generate Link */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 border-2 border-gray-200 rounded-lg">
                  <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                    <LinkIcon className="text-green-600" fontSize="small" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Generate Public Link</h3>
                    <p className="text-xs text-gray-600">
                      Send a link to external users to fill out the form themselves.
                    </p>
                  </div>
                </div>

                {/* Email Inputs */}
                <div className="pl-9 space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Recipient Email{emails.length > 1 ? 's' : ''}
                  </label>
                  
                  {emails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative flex-1">
                        <EmailIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          placeholder="business@example.com"
                          className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 bg-white hover:border-gray-300"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && hasValidEmail) {
                              handleGenerateLink()
                            }
                          }}
                        />
                      </div>
                      {index === 0 ? (
                        <button
                          type="button"
                          onClick={addEmailField}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors border border-green-200"
                          title="Add another email"
                        >
                          <AddIcon className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeEmailField(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove email"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={handleGenerateLink}
                    disabled={isGenerating || !hasValidEmail}
                    className="w-full px-3 py-2 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isGenerating ? 'Sending...' : `Send to ${emails.filter(e => e && e.includes('@')).length || 0} recipient${emails.filter(e => e && e.includes('@')).length !== 1 ? 's' : ''}`}
                  </button>
                  
                  {error && (
                    <p className="mt-1 text-xs text-red-600">{error}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <EmailIcon className="text-green-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Link Sent Successfully!
                </h3>
                <p className="text-xs text-gray-600">
                  The public booking request link has been sent to:
                </p>
                <div className="mt-2 space-y-1">
                  {sentEmails.map((sentEmail, index) => (
                    <p key={index} className="text-xs font-medium text-gray-900">{sentEmail}</p>
                  ))}
                </div>
              </div>
              
              {generatedUrl && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700">Link URL:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedUrl}
                      readOnly
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-2.5 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

