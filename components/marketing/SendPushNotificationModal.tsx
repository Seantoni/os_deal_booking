'use client'

import { useState } from 'react'
import { Button, Input, Textarea } from '@/components/ui'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import ScheduleIcon from '@mui/icons-material/Schedule'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ImageIcon from '@mui/icons-material/Image'
import LinkIcon from '@mui/icons-material/Link'
import toast from 'react-hot-toast'

interface SendPushNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  optionId: string
  bookingRequestId: string
  businessName: string
  generatedCopy?: string | null
  availableImages?: string[]
  onSuccess?: () => void
}

export default function SendPushNotificationModal({
  isOpen,
  onClose,
  optionId,
  bookingRequestId,
  businessName,
  generatedCopy,
  availableImages = [],
  onSuccess,
}: SendPushNotificationModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState(generatedCopy || '')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [sendOption, setSendOption] = useState<'now' | 'scheduled'>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [sending, setSending] = useState(false)

  // Initialize body with generated copy when it changes
  useState(() => {
    if (generatedCopy && !body) {
      setBody(generatedCopy)
    }
  })

  // Get minimum date/time for scheduling (now)
  const getMinDateTime = () => {
    const now = new Date()
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
    }
  }

  const minDateTime = getMinDateTime()

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('Please enter a notification title')
      return
    }
    if (!body.trim()) {
      toast.error('Please enter a notification body')
      return
    }

    // Validate scheduled time if selected
    if (sendOption === 'scheduled') {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Please select a date and time for scheduling')
        return
      }
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      if (scheduledDateTime <= new Date()) {
        toast.error('Scheduled time must be in the future')
        return
      }
    }

    // Validate URL if provided
    if (linkUrl.trim() && !isValidUrl(linkUrl.trim())) {
      toast.error('Please enter a valid URL')
      return
    }

    setSending(true)
    try {
      // Build scheduled time if applicable
      let scheduledAt: string | undefined
      if (sendOption === 'scheduled' && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const response = await fetch('/api/push-notification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          imageUrl: selectedImage || undefined,
          linkUrl: linkUrl.trim() || undefined,
          scheduledAt,
          marketingOptionId: optionId,
          bookingRequestId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (sendOption === 'scheduled') {
          toast.success('Push notification scheduled successfully!')
        } else {
          toast.success('Push notification sent successfully!')
        }
        onSuccess?.()
        onClose()
      } else {
        toast.error(result.error || 'Failed to send push notification')
      }
    } catch (error) {
      toast.error('An error occurred sending the notification')
    } finally {
      setSending(false)
    }
  }

  // Validate URL
  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleUseGeneratedCopy = () => {
    if (generatedCopy) {
      setBody(generatedCopy)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="flex items-center gap-2 text-white">
            <NotificationsActiveIcon />
            <h2 className="font-semibold">Send Push Notification</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Business context */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Sending notification for:</p>
            <p className="font-medium text-gray-800">{businessName}</p>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Notification Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 🔥 Nueva Oferta en OfertaSimple!"
              maxLength={100}
              className="text-sm"
            />
            <p className="text-xs text-gray-400 text-right">{title.length}/100</p>
          </div>

          {/* Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Notification Body <span className="text-red-500">*</span>
              </label>
              {generatedCopy && (
                <button
                  type="button"
                  onClick={handleUseGeneratedCopy}
                  className="text-xs text-purple-600 hover:text-purple-800"
                >
                  Use Marketing Copy
                </button>
              )}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write an engaging message..."
              rows={4}
              maxLength={500}
              className="text-sm"
            />
            <p className="text-xs text-gray-400 text-right">{body.length}/500</p>
          </div>

          {/* Link URL */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LinkIcon className="text-gray-400" fontSize="small" />
              <label className="text-sm font-medium text-gray-700">
                Link URL (optional)
              </label>
            </div>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://ofertasimple.com/deal/..."
              className="text-sm"
            />
            <p className="text-xs text-gray-400">
              Where users will be taken when they tap the notification
            </p>
          </div>

          {/* Send Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ScheduleIcon className="text-gray-400" fontSize="small" />
              <label className="text-sm font-medium text-gray-700">
                When to Send
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSendOption('now')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                  sendOption === 'now'
                    ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Send Now
              </button>
              <button
                type="button"
                onClick={() => setSendOption('scheduled')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                  sendOption === 'scheduled'
                    ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Schedule
              </button>
            </div>
            {sendOption === 'scheduled' && (
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={minDateTime.date}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min={scheduledDate === minDateTime.date ? minDateTime.time : undefined}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Image Selection */}
          {availableImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-gray-400" fontSize="small" />
                <label className="text-sm font-medium text-gray-700">
                  Attach Image (optional)
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* No image option */}
                <button
                  onClick={() => setSelectedImage(null)}
                  className={`w-16 h-16 rounded border-2 flex items-center justify-center text-xs text-gray-500 transition-all ${
                    selectedImage === null
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  None
                </button>
                {/* Available images */}
                {availableImages.map((url, index) => (
                  <button
                    key={url}
                    onClick={() => setSelectedImage(url)}
                    className={`relative w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                      selectedImage === url
                        ? 'border-purple-500 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Option ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedImage === url && (
                      <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                        <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 text-xs font-medium text-gray-500 border-b flex items-center justify-between">
              <span>Preview</span>
              {sendOption === 'scheduled' && scheduledDate && scheduledTime && (
                <span className="text-purple-600 flex items-center gap-1">
                  <ScheduleIcon style={{ fontSize: 12 }} />
                  {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('es-PA', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <div className="p-3 flex gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg font-bold">O</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {title || 'Notification Title'}
                </p>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {body || 'Notification body will appear here...'}
                </p>
                {linkUrl.trim() && (
                  <p className="text-[10px] text-blue-500 truncate mt-1 flex items-center gap-1">
                    <LinkIcon style={{ fontSize: 10 }} />
                    {linkUrl}
                  </p>
                )}
              </div>
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Notification"
                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                />
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>⚠️ Important:</strong> This notification will be sent to all app users
              subscribed to promotional notifications. Make sure the content is accurate
              and approved before sending.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim() || (sendOption === 'scheduled' && (!scheduledDate || !scheduledTime))}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {sending ? (
              sendOption === 'scheduled' ? 'Scheduling...' : 'Sending...'
            ) : sendOption === 'scheduled' ? (
              <>
                <ScheduleIcon fontSize="small" className="mr-1" />
                Schedule Notification
              </>
            ) : (
              <>
                <SendIcon fontSize="small" className="mr-1" />
                Send Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

