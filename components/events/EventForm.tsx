'use client'

import { createEvent } from '@/app/actions/events'
import { useState } from 'react'
import CategorySelect from '@/components/shared/CategorySelect'
import { CategoryOption } from '@/lib/categories'
import { Button, Input, Textarea, Alert } from '@/components/ui'

interface EventFormProps {
  onSuccess?: () => void
}

export default function EventForm({ onSuccess }: EventFormProps = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categoryOption, setCategoryOption] = useState<CategoryOption | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    if (categoryOption) {
      formData.set('category', categoryOption.label)
      formData.set('parentCategory', categoryOption.parent)
      if (categoryOption.sub1) formData.set('subCategory1', categoryOption.sub1)
      if (categoryOption.sub2) formData.set('subCategory2', categoryOption.sub2)
    }

    try {
      await createEvent(formData)
      // Reset form
      event.currentTarget.reset()
      setCategoryOption(null)
      // Call onSuccess callback if provided (parent component handles refresh)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        id="name"
        name="name"
        type="text"
        label="Event Name"
        required
        placeholder="Event Name"
      />

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <CategorySelect selectedOption={categoryOption} onChange={setCategoryOption} />
      </div>

      <Textarea
        id="description"
        name="description"
        label="Description"
        rows={3}
        placeholder="Optional event description..."
      />

      <Input
        id="startDate"
        name="startDate"
        type="datetime-local"
        label="Start Date & Time"
        required
      />

      <Input
        id="endDate"
        name="endDate"
        type="datetime-local"
        label="End Date & Time"
        required
      />

      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        fullWidth
      >
        Create Event
      </Button>
    </form>
  )
}
