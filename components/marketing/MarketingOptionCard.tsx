'use client'

import { useState, useRef } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import EventIcon from '@mui/icons-material/Event'
import { formatISODateOnly, daysUntil } from '@/lib/date'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import ImageLightbox from '@/components/common/ImageLightbox'
import OptionChatThread from './OptionChatThread'
import UserSelect, { type UserOption } from '@/components/shared/UserSelect'
import toast from 'react-hot-toast'

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
  responsibleId: string | null
  mediaUrls: unknown
  createdAt: Date
  updatedAt: Date
}

interface MarketingOptionCardProps {
  option: MarketingOption & {
    completedByUser?: {
      clerkId: string
      name: string | null
      email: string | null
    } | null
    responsibleUser?: {
      clerkId: string
      name: string | null
      email: string | null
    } | null
  }
  optionLabel: string
  canEdit: boolean
  saving: boolean
  draggingImage?: string | null // URL of image being dragged from gallery
  users?: UserOption[] // Users for responsible dropdown
  onTogglePlanned: (optionId: string, isPlanned: boolean) => Promise<void>
  onToggleCompleted: (optionId: string, isCompleted: boolean) => Promise<void>
  onUpdateDueDate: (optionId: string, dueDate: Date | null) => Promise<void>
  onUpdateResponsible?: (optionId: string, responsibleId: string | null, responsibleUser?: UserOption | null) => Promise<void>
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
  users = [],
  onTogglePlanned,
  onToggleCompleted,
  onUpdateDueDate,
  onUpdateResponsible,
  onAddAttachment,
  onRemoveAttachment,
  onImageDrop,
}: MarketingOptionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toggle expanded state while preserving scroll position
  const toggleExpanded = (event: React.MouseEvent | React.KeyboardEvent) => {
    if (!option.isPlanned) return
    
    // Find the scroll container and save position
    const scrollContainer = (event.target as HTMLElement).closest('.overflow-y-auto')
    const scrollTop = scrollContainer?.scrollTop || 0
    
    setExpanded(prev => !prev)
    
    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop
      }
    })
  }

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
        toast.error('La imagen ya está adjunta a esta opción')
      }
    }
  }

  const handleTogglePlanned = async () => {
    if (!canEdit || saving) return
    const newPlannedState = !option.isPlanned
    await onTogglePlanned(option.id, newPlannedState)
    // Expand the card when planning (checking the checkbox)
    if (newPlannedState) {
      setExpanded(true)
    }
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

  const handleResponsibleChange = async (userId: string | null, user: UserOption | null) => {
    if (!canEdit || !onUpdateResponsible) return
    await onUpdateResponsible(option.id, userId, user)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo debe ser menor a 10MB')
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
        toast.success('Imagen subida')
      } else {
        toast.error(result.error || 'Error al subir imagen')
      }
    } catch (err) {
      toast.error('Ocurrió un error al subir la imagen')
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

const isOverdue = option.dueDate && new Date(option.dueDate) < new Date() && !option.isCompleted
  const daysLeft = option.dueDate ? daysUntil(option.dueDate) : null

  // Determine if this card can receive a drop
  const canReceiveDrop = draggingImage && option.isPlanned && canEdit

  // Format days left text
  const getDaysLeftText = () => {
    if (daysLeft === null) return null
    if (daysLeft < 0) return `${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? 's' : ''} vencido${Math.abs(daysLeft) !== 1 ? 's' : ''}`
    if (daysLeft === 0) return 'Vence hoy'
    if (daysLeft === 1) return 'Vence mañana'
    return `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`
  }

  // Get styling for days left badge
  const getDaysLeftStyle = () => {
    if (daysLeft === null) return ''
    if (daysLeft < 0) return 'bg-red-100 text-red-700 border-red-200'
    if (daysLeft === 0) return 'bg-orange-100 text-orange-700 border-orange-200'
    if (daysLeft <= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border rounded-lg transition-all shadow-sm ${
        isDragOver && canReceiveDrop
          ? 'bg-blue-50 border-blue-400 border-dashed ring-2 ring-blue-100'
          : option.isCompleted
          ? 'bg-white border-green-200'
          : option.isPlanned
          ? isOverdue
            ? 'bg-white border-red-200'
            : 'bg-white border-gray-200'
          : 'bg-gray-50/50 border-gray-200'
      } ${canReceiveDrop ? 'cursor-copy' : ''}`}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={option.isPlanned ? 0 : -1}
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (option.isPlanned && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            toggleExpanded(e)
          }
        }}
        className={`w-full px-2 py-1.5 flex items-center gap-2 transition-colors ${
          expanded ? 'border-b border-gray-100' : ''
        } ${option.isPlanned ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
        title={option.isPlanned ? (expanded ? 'Contraer' : 'Expandir') : undefined}
      >
        {/* Planned checkbox */}
        <input
          type="checkbox"
          checked={option.isPlanned}
          onChange={handleTogglePlanned}
          onClick={(e) => e.stopPropagation()}
          disabled={!canEdit || saving}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
          title={option.isPlanned ? 'Desplanificar esta opción' : 'Planificar esta opción'}
        />

        {/* Option name */}
        <span className={`font-medium flex-1 text-xs text-left ${!option.isPlanned ? 'text-gray-500' : 'text-gray-900'}`}>
          {optionLabel}
        </span>

        {/* Action Buttons Group */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Completed toggle (only if planned) */}
          {option.isPlanned && (
            <button
              type="button"
              onClick={handleToggleCompleted}
              disabled={!canEdit || saving}
              className={`p-0.5 rounded transition-all ${
                option.isCompleted
                  ? 'text-green-600 bg-green-50 hover:bg-green-100'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              title={option.isCompleted ? 'Marcar como incompleto' : 'Marcar como completo'}
            >
              {option.isCompleted ? (
                <CheckCircleIcon fontSize="small" style={{ fontSize: 16 }} />
              ) : (
                <CheckCircleOutlineIcon fontSize="small" style={{ fontSize: 16 }} />
              )}
            </button>
          )}

          {/* Expand/collapse indicator (only if planned) */}
          {option.isPlanned && (
            <div className="p-0.5 text-gray-400">
              {expanded ? <ExpandLessIcon fontSize="small" style={{ fontSize: 16 }} /> : <ExpandMoreIcon fontSize="small" style={{ fontSize: 16 }} />}
            </div>
          )}
        </div>
      </div>

      {/* Expanded details (only if planned and expanded) */}
      {option.isPlanned && expanded && (
        <div className="bg-white rounded-b-lg divide-y divide-gray-100">
          
          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 bg-gray-50/30">
            
            {/* Left Column: Properties */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-blue-50 text-blue-600 rounded">
                  <EventIcon style={{ fontSize: 16 }} />
                </div>
                <span className="text-sm font-semibold text-gray-900">Detalles</span>
              </div>

              <div className="space-y-3">
                {/* Due Date Row */}
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-gray-500 font-medium">Fecha Límite</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={formatISODateOnly(option.dueDate)}
                      onChange={handleDueDateChange}
                      disabled={!canEdit}
                      className={`px-2 py-1 text-xs border rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white ${
                        isOverdue ? 'border-red-300 text-red-600 font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      } disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    />
                    {daysLeft !== null && option.dueDate && !option.isCompleted && (
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border flex-shrink-0 ${getDaysLeftStyle()}`}>
                        {getDaysLeftText()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Responsible Row */}
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-gray-500 font-medium">Responsable</span>
                  <div className="w-[180px] flex justify-end">
                    <UserSelect
                      value={option.responsibleId}
                      onChange={handleResponsibleChange}
                      users={users}
                      canEdit={canEdit && users.length > 0}
                      showIcon={false}
                      showLabel={false}
                      placeholder="Sin asignar"
                      size="sm"
                      variant="compact"
                    />
                  </div>
                </div>

                {/* Completed By Info (if completed) */}
                {option.isCompleted && option.completedByUser && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">Estado</span>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                      <CheckCircleIcon style={{ fontSize: 12 }} />
                      Completado por {option.completedByUser.name || option.completedByUser.email?.split('@')[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Attachments */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-purple-50 text-purple-600 rounded">
                    <AttachFileIcon style={{ fontSize: 16 }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Adjuntos ({mediaUrls.length})</span>
                </div>
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
                      className="px-2 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <AddPhotoAlternateIcon style={{ fontSize: 14 }} />
                      {uploading ? 'Subiendo...' : 'Agregar'}
                    </button>
                  </div>
                )}
              </div>

              {/* Gallery Grid */}
              {mediaUrls.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {mediaUrls.map((url, index) => (
                    <div key={url} className="relative group aspect-square">
                      <img
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover rounded-md border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setLightboxIndex(index)
                          setLightboxOpen(true)
                        }}
                      />
                      {canEdit && (
                        <button
                          onClick={() => handleRemoveAttachment(url)}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-white text-red-500 rounded-full border border-gray-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-50 z-10 scale-90"
                          title="Eliminar adjunto"
                        >
                          <DeleteIcon style={{ fontSize: 12 }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-colors ${
                    isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white/50'
                  }`}
                >
                  <p className="text-xs text-gray-400">
                    No hay adjuntos
                  </p>
                  {canEdit && (
                    <p className="text-[10px] text-gray-300 mt-1">
                      Arrastra imágenes aquí
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Activity / Chat Section */}
          <div className="p-3 bg-white">
            <OptionChatThread optionId={option.id} canEdit={canEdit} />
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
