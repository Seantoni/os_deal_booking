'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import CategorySelect from '@/components/shared/CategorySelect'
import { getCategoryOptions, type CategoryOption } from '@/lib/categories'
import { Input } from '@/components/ui'
import { saveBookingRequestDraft, sendBookingRequest } from '@/app/actions/booking'
import type { BookingRequest } from '@/types'

interface BookingRequestFormProps {
  requestToEdit?: BookingRequest | null
}

export default function BookingRequestForm({ requestToEdit }: BookingRequestFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [categoryOption, setCategoryOption] = useState<CategoryOption | null>(null)
  const [merchant, setMerchant] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // React 19: useTransition for non-blocking UI during form actions
  const [isPending, startTransition] = useTransition()
  const isSubmitting = isPending

  // Pre-fill form if editing
  useEffect(() => {
    if (requestToEdit) {
      setName(requestToEdit.name)
      setMerchant(requestToEdit.merchant || '')
      setBusinessEmail(requestToEdit.businessEmail)
      
      // Format dates for input fields (YYYY-MM-DD)
      const formatDate = (date: Date) => {
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      setStartDate(formatDate(requestToEdit.startDate))
      setEndDate(formatDate(requestToEdit.endDate))
      
      // Set category
      if (requestToEdit.parentCategory) {
        const options = getCategoryOptions()
        const match = options.find(opt => 
          opt.parent === requestToEdit.parentCategory &&
          opt.sub1 === requestToEdit.subCategory1 &&
          opt.sub2 === requestToEdit.subCategory2
        )
        if (match) setCategoryOption(match)
      }
    }
  }, [requestToEdit])

  // React 19: Form submit handler using useTransition
  const handleSubmit = (action: 'draft' | 'send') => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        // Create FormData
        const formData = new FormData()
        formData.append('name', name)
        formData.append('category', categoryOption?.value || '')
        formData.append('parentCategory', categoryOption?.parent || '')
        formData.append('subCategory1', categoryOption?.sub1 || '')
        formData.append('subCategory2', categoryOption?.sub2 || '')
        formData.append('merchant', merchant)
        formData.append('businessEmail', businessEmail)
        formData.append('startDate', startDate)
        formData.append('endDate', endDate)

        let result
        if (action === 'draft') {
          result = await saveBookingRequestDraft(formData, requestToEdit?.id)
          if (result.success) {
            setSuccess('Draft saved successfully!')
          }
        } else {
          result = await sendBookingRequest(formData, requestToEdit?.id)
          if (result.success) {
            setSuccess('Booking request sent! Status changed to Pending.')
            setTimeout(() => {
              router.push('/booking-requests')
              router.refresh()
            }, 1500)
          }
        }

        if (!result.success) {
          setError(result.error || 'An error occurred')
        }
      } catch (err) {
        console.error('Form submission error:', err)
        setError('An unexpected error occurred')
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md border border-gray-200 p-5">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {requestToEdit ? 'Edit Booking Request' : 'New Booking Request'}
        </h1>
        <p className="text-sm text-gray-600">Fill in the details below to create a booking request</p>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-400 text-green-700 rounded-md text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      <form className="space-y-3">
        {/* Event Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Event Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter event name"
            required
            size="sm"
            fullWidth={false}
          />
        </div>

        {/* Category and Merchant in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Category
            </label>
            <CategorySelect
              selectedOption={categoryOption}
              onChange={setCategoryOption}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Merchant/Aliado
            </label>
            <Input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Enter merchant name"
              size="sm"
              fullWidth={false}
            />
          </div>
        </div>

        {/* Business Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Email del Comercio <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder="business@example.com"
            required
            size="sm"
            fullWidth={false}
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              size="sm"
              fullWidth={false}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              End Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              size="sm"
              fullWidth={false}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.push('/booking-requests')}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting || !name || !businessEmail || !startDate || !endDate}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('send')}
            disabled={isSubmitting || !name || !businessEmail || !startDate || !endDate}
            className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 disabled:from-blue-300 disabled:to-blue-300 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg"
          >
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </form>
    </div>
  )
}

