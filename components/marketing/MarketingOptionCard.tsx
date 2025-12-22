'use client'

import { useState, useRef } from 'react'

// Define type inline to avoid Prisma client regeneration issues
interface MarketingOption {
  id: string
  campaignId: string
  platform: string
  optionType: string
  isPlanned: boolean
  isCompleted: boolean
  dueDate: Date | null
  completedAt: Date | null
  completedBy: string | null
  notes: string | null
  notesUpdatedBy: string | null
  notesUpdatedAt: Date | null
  mediaUrls: unknown
  createdAt: Date
  updatedAt: Date
}
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import EventIcon from '@mui/icons-material/Event'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import { Button, Textarea } from '@/components/ui'
import ImageLightbox from '@/components/common/ImageLightbox'
import toast from 'react-hot-toast'

interface MarketingOptionCardProps {
  option: MarketingOption & {
    completedByUser?: {
      clerkId: string
      name: string | null
      email: string | null
    } | null
    notesUpdatedByUser?: {
      clerkId: string
      name: string | null
      email: string | null
    } | null
  }
  optionLabel: string
  canEdit: boolean
  saving: boolean
  draggingImage?: string | null // URL of image being dragged from gallery
  onTogglePlanned: (optionId: string, isPlanned: boolean) => Promise<void>
  onToggleCompleted: (optionId: string, isCompleted: boolean) => Promise<void>
  onUpdateDueDate: (optionId: string, dueDate: Date | null) => Promise<void>
  onUpdateNotes: (optionId: string, notes: string | null) => Promise<void>
  onAddAttachment: (optionId: string, url: string) => Promise<void>
  onRemoveAttachment: (optionId: string, url: string) => Promise<void>
  onImageDrop?: (optionId: string, imageUrl: string) => Promise<void>
}

export default function MarketingOptionCard({
  option,
  optionLabel,
  canEdit,
  saving,
  draggingImage,
  onTogglePlanned,
  onToggleCompleted,
  onUpdateDueDate,
  onUpdateNotes,
  onAddAttachment,
  onRemoveAttachment,
  onImageDrop,
}: MarketingOptionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [localNotes, setLocalNotes] = useState(option.notes || '')
  const [notesEditing, setNotesEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mediaUrls = (option.mediaUrls as string[]) || []

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggingImage && option.isPlanned && canEdit) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (draggingImage && option.isPlanned && canEdit && onImageDrop) {
      // Check if image is already attached
      if (!mediaUrls.includes(draggingImage)) {
        await onImageDrop(option.id, draggingImage)
      } else {
        toast.error('Image already attached to this option')
      }
    }
  }

  const handleTogglePlanned = async () => {
    if (!canEdit || saving) return
    await onTogglePlanned(option.id, !option.isPlanned)
  }

  const handleToggleCompleted = async () => {
    if (!canEdit || saving || !option.isPlanned) return
    await onToggleCompleted(option.id, !option.isCompleted)
  }

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return
    const value = e.target.value
    const newDate = value ? new Date(value) : null
    await onUpdateDueDate(option.id, newDate)
  }

  const handleSaveNotes = async () => {
    if (!canEdit) return
    await onUpdateNotes(option.id, localNotes || null)
    setNotesEditing(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Only images are allowed')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', `marketing/${option.campaignId}`)
      formData.append('makePublic', 'true')

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success && result.url) {
        await onAddAttachment(option.id, result.url)
        toast.success('Image uploaded')
      } else {
        toast.error(result.error || 'Failed to upload image')
      }
    } catch (err) {
      toast.error('An error occurred uploading the image')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAttachment = async (url: string) => {
    if (!canEdit) return
    await onRemoveAttachment(option.id, url)
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }

  const isOverdue = option.dueDate && new Date(option.dueDate) < new Date() && !option.isCompleted

  // Determine if this card can receive a drop
  const canReceiveDrop = draggingImage && option.isPlanned && canEdit

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border rounded transition-all ${
        isDragOver && canReceiveDrop
          ? 'bg-blue-100 border-blue-400 border-dashed ring-2 ring-blue-200'
          : option.isCompleted
          ? 'bg-green-50 border-green-200'
          : option.isPlanned
          ? isOverdue
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
          : 'bg-gray-50 border-gray-200'
      } ${canReceiveDrop ? 'cursor-copy' : ''}`}
    >
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-3">
        {/* Planned checkbox */}
        <input
          type="checkbox"
          checked={option.isPlanned}
          onChange={handleTogglePlanned}
          disabled={!canEdit || saving}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
          title={option.isPlanned ? 'Unplan this option' : 'Plan this option'}
        />

        {/* Option name */}
        <span className={`font-medium flex-1 text-sm ${!option.isPlanned ? 'text-gray-500' : 'text-gray-800'}`}>
          {optionLabel}
        </span>

        {/* Completed toggle (only if planned) */}
        {option.isPlanned && (
          <button
            onClick={handleToggleCompleted}
            disabled={!canEdit || saving}
            className={`p-0.5 rounded transition-colors ${
              option.isCompleted
                ? 'text-green-600 hover:bg-green-100'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            title={option.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {option.isCompleted ? (
              <CheckCircleIcon fontSize="small" style={{ fontSize: 18 }} />
            ) : (
              <CheckCircleOutlineIcon fontSize="small" style={{ fontSize: 18 }} />
            )}
          </button>
        )}

        {/* Expand/collapse if planned */}
        {option.isPlanned && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 rounded text-gray-500 hover:bg-gray-100 transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ExpandLessIcon fontSize="small" style={{ fontSize: 18 }} /> : <ExpandMoreIcon fontSize="small" style={{ fontSize: 18 }} />}
          </button>
        )}
      </div>

      {/* Expanded details (only if planned and expanded) */}
      {option.isPlanned && expanded && (
        <div className="border-t border-gray-200 px-3 py-2 space-y-2.5 bg-white/50">
          {/* Due date */}
          <div className="flex items-center gap-2">
            <EventIcon className="text-gray-400" style={{ fontSize: 16 }} />
            <label className="text-xs text-gray-600 min-w-[60px]">Due Date:</label>
            <input
              type="date"
              value={formatDate(option.dueDate)}
              onChange={handleDueDateChange}
              disabled={!canEdit}
              className={`px-1.5 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            />
            {isOverdue && <span className="text-[10px] text-red-600 font-bold uppercase">Overdue</span>}
          </div>

          {/* Completed info */}
          {option.isCompleted && option.completedAt && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
              <CheckCircleIcon style={{ fontSize: 14 }} />
              <span>
                Completed {new Date(option.completedAt).toLocaleDateString()}
                {option.completedByUser && (
                  <> by {option.completedByUser.name || option.completedByUser.email}</>
                )}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <NoteAddIcon className="text-gray-400" style={{ fontSize: 16 }} />
                <span className="text-xs text-gray-600">Notes:</span>
              </div>
              {option.notesUpdatedByUser && option.notesUpdatedAt && (
                <span className="text-[10px] text-gray-400 italic">
                  by {option.notesUpdatedByUser.name || option.notesUpdatedByUser.email?.split('@')[0]} · {new Date(option.notesUpdatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {notesEditing ? (
              <div className="space-y-1.5">
                <Textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Add notes for this option..."
                  rows={2}
                  className="text-xs"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={handleSaveNotes} disabled={saving} className="h-6 text-[10px] px-2">
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setLocalNotes(option.notes || '')
                      setNotesEditing(false)
                    }}
                    className="h-6 text-[10px] px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => canEdit && setNotesEditing(true)}
                className={`text-xs p-1.5 bg-white border rounded min-h-[40px] ${
                  canEdit ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
              >
                {option.notes || (
                  <span className="text-gray-400 italic">
                    {canEdit ? 'Click to add notes...' : 'No notes'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AttachFileIcon className="text-gray-400" style={{ fontSize: 16 }} />
                <span className="text-xs text-gray-600">Attachments ({mediaUrls.length}):</span>
              </div>
              
              {/* Upload button */}
              {canEdit && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    <AddPhotoAlternateIcon style={{ fontSize: 14 }} />
                    {uploading ? 'Uploading...' : 'Add Image'}
                  </button>
                </div>
              )}
            </div>

            {/* Image gallery */}
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mediaUrls.map((url, index) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setLightboxIndex(index)
                        setLightboxOpen(true)
                      }}
                    />
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveAttachment(url)}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Remove attachment"
                      >
                        <DeleteIcon style={{ fontSize: 10 }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image lightbox */}
      <ImageLightbox
        images={mediaUrls}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen && mediaUrls.length > 0}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}

