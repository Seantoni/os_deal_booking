import { useState, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ImageIcon from '@mui/icons-material/Image'
import CloseIcon from '@mui/icons-material/Close'
import CollectionsIcon from '@mui/icons-material/Collections'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DescriptionIcon from '@mui/icons-material/Description'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import type { BookingAttachment, BookingFormData } from '../types'
import { Input, Textarea, Button } from '@/components/ui'
import toast from 'react-hot-toast'
import { compressImage, compressImages } from '@/lib/utils/image-compression'
import ImageLightbox from '@/components/common/ImageLightbox'

/** Set to true to show "Generar título con AI" and auto-fill option titles. */
const SHOW_AI_OPTION_TITLE = false
const INVALID_TITLE_PATTERN = /\$|%|\busd\b|\bdolares?\b|\b(paga|pagar|compra|comprar|llevate|lleva|valor|oferta|promo(?:cion)?)\b/i

interface EstructuraStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  addPricingOption: () => void
  removePricingOption: (index: number) => void
  updatePricingOption: (index: number, field: string, value: string) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function EstructuraStep({ 
  formData, 
  errors, 
  updateFormData,
  addPricingOption, 
  removePricingOption, 
  updatePricingOption,
  isFieldRequired = () => false
}: EstructuraStepProps) {
  const [aiLoadingIndex, setAiLoadingIndex] = useState<number | null>(null)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const getTitleFormatIssue = useCallback((title?: string) => {
    const normalizedTitle = title?.trim() || ''
    if (!normalizedTitle) return null
    if (INVALID_TITLE_PATTERN.test(normalizedTitle)) {
      return 'Quita precios y frases como "Paga" o "Compra".'
    }
    return null
  }, [])

  const handleImageUpload = async (index: number, file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor, selecciona una imagen válida (JPG, PNG, GIF, WEBP)')
      return
    }

    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('La imagen no puede superar los 25MB')
      return
    }

    setUploadingIndex(index)

    try {
      // Compress image before upload (target: 500KB, max 1920px)
      const compressedFile = await compressImage(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        initialQuality: 0.8,
      })

      const uploadFormData = new FormData()
      uploadFormData.append('file', compressedFile)
      uploadFormData.append('folder', 'deal-images')
      uploadFormData.append('isPublic', 'true')

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (response.ok) {
        updatePricingOption(index, 'imageUrl', data.url)
        toast.success('Imagen cargada exitosamente')
      } else {
        toast.error(data.message || 'Error al cargar la imagen')
      }
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error('Error al cargar la imagen')
    } finally {
      setUploadingIndex(null)
    }
  }

  const handleRemoveImage = (index: number) => {
    updatePricingOption(index, 'imageUrl', '')
    // Reset file input
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = ''
    }
  }

  // Gallery image handlers
  const [galleryUploading, setGalleryUploading] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const attachmentsInputRef = useRef<HTMLInputElement>(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)

  const dealImages = Array.isArray(formData.dealImages) ? formData.dealImages : []
  const bookingAttachments = Array.isArray(formData.bookingAttachments) ? formData.bookingAttachments : []

  const attachmentMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  const attachmentExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx']

  const formatFileSize = (bytes: number): string => {
    if (bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unit = 0
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024
      unit += 1
    }
    return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
  }

  const getAttachmentTypeLabel = (mimeType: string, filename: string): string => {
    const ext = filename.split('.').pop()?.toUpperCase() || ''
    if (mimeType.startsWith('image/')) return ext || 'Imagen'
    if (mimeType === 'application/pdf' || ext === 'PDF') return 'PDF'
    if (ext === 'DOC' || ext === 'DOCX' || mimeType.includes('word')) return ext || 'DOC'
    return ext || 'Archivo'
  }

  const getAttachmentKind = (attachment: BookingAttachment): 'image' | 'pdf' | 'doc' | 'file' => {
    const mimeType = attachment.mimeType || ''
    const extension = attachment.filename.split('.').pop()?.toLowerCase() || ''
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image'
    if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf'
    if (mimeType.includes('word') || extension === 'doc' || extension === 'docx') return 'doc'
    return 'file'
  }

  // Open lightbox with images
  const openLightbox = (images: string[], initialIndex: number = 0) => {
    setLightboxImages(images)
    setLightboxInitialIndex(initialIndex)
    setLightboxOpen(true)
  }

  // Move gallery image left (decrease order)
  const moveGalleryImageLeft = (imageUrl: string) => {
    const currentIdx = dealImages.findIndex(img => img.url === imageUrl)
    if (currentIdx <= 0) return
    
    const newImages = [...dealImages]
    // Swap with previous image
    const temp = newImages[currentIdx]
    newImages[currentIdx] = newImages[currentIdx - 1]
    newImages[currentIdx - 1] = temp
    // Update order values
    const reorderedImages = newImages.map((img, idx) => ({ ...img, order: idx }))
    updateFormData('dealImages', reorderedImages)
  }

  // Move gallery image right (increase order)
  const moveGalleryImageRight = (imageUrl: string) => {
    const currentIdx = dealImages.findIndex(img => img.url === imageUrl)
    if (currentIdx < 0 || currentIdx >= dealImages.length - 1) return
    
    const newImages = [...dealImages]
    // Swap with next image
    const temp = newImages[currentIdx]
    newImages[currentIdx] = newImages[currentIdx + 1]
    newImages[currentIdx + 1] = temp
    // Update order values
    const reorderedImages = newImages.map((img, idx) => ({ ...img, order: idx }))
    updateFormData('dealImages', reorderedImages)
  }

  const handleGalleryUpload = async (files: FileList) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 25 * 1024 * 1024 // 25MB before compression

    const validFiles = Array.from(files).filter(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Formato no válido`)
        return false
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: Excede 25MB`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setGalleryUploading(true)

    try {
      // Compress all images before upload (target: 500KB, max 1920px)
      const compressedFiles = await compressImages(validFiles, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        initialQuality: 0.8,
      })

      const uploadPromises = compressedFiles.map(async (file) => {
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('folder', 'deal-images')
        uploadFormData.append('isPublic', 'true')

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: uploadFormData,
        })

        const data = await response.json()
        if (response.ok) {
          return data.url
        } else {
          throw new Error(data.message || 'Error uploading')
        }
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      
      // Add new images with order
      const currentMaxOrder = dealImages.length > 0 
        ? Math.max(...dealImages.map(img => img.order)) 
        : -1
      
      const newImages = uploadedUrls.map((url, idx) => ({
        url,
        order: currentMaxOrder + 1 + idx
      }))

      updateFormData('dealImages', [...dealImages, ...newImages])
      toast.success(`${uploadedUrls.length} imagen(es) cargada(s)`)
    } catch (error) {
      console.error('Gallery upload error:', error)
      toast.error('Error al cargar algunas imágenes')
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    }
  }

  const handleRemoveGalleryImage = (imageUrl: string) => {
    const updatedImages = dealImages.filter(img => img.url !== imageUrl)
    // Reorder remaining images
    const reorderedImages = updatedImages.map((img, idx) => ({
      ...img,
      order: idx
    }))
    updateFormData('dealImages', reorderedImages)
  }

  const handleAttachmentUpload = async (files: FileList) => {
    const maxSize = 25 * 1024 * 1024 // 25MB

    const validFiles = Array.from(files).filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      const isValidType = attachmentMimeTypes.includes(file.type) || attachmentExtensions.includes(extension)
      if (!isValidType) {
        toast.error(`${file.name}: Formato no permitido`)
        return false
      }

      if (file.size > maxSize) {
        toast.error(`${file.name}: Excede 25MB`)
        return false
      }

      return true
    })

    if (validFiles.length === 0) return

    setAttachmentsUploading(true)
    try {
      const uploadPromises = validFiles.map(async (file): Promise<BookingAttachment> => {
        const fileToUpload = file.type.startsWith('image/')
          ? await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920, initialQuality: 0.8 })
          : file

        const presignRes = await fetch('/api/upload/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: fileToUpload.name,
            contentType: fileToUpload.type || 'application/octet-stream',
            size: fileToUpload.size,
            folder: 'booking-attachments',
          }),
        })

        const presignData = await presignRes.json()
        if (!presignRes.ok || !presignData?.presignedUrl) {
          throw new Error(presignData?.error || `Error al preparar carga de ${file.name}`)
        }

        const uploadRes = await fetch(presignData.presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': fileToUpload.type || 'application/octet-stream' },
          body: fileToUpload,
        })

        if (!uploadRes.ok) {
          throw new Error(`Error al cargar ${file.name} a S3`)
        }

        return {
          url: presignData.url,
          filename: file.name,
          mimeType: fileToUpload.type || 'application/octet-stream',
          size: fileToUpload.size,
        }
      })

      const uploadedAttachments = await Promise.all(uploadPromises)
      const merged = [...bookingAttachments, ...uploadedAttachments]
      const deduped = Array.from(
        new Map(merged.map((attachment) => [`${attachment.url}|${attachment.filename}`, attachment])).values()
      )

      updateFormData('bookingAttachments', deduped)
      toast.success(`${uploadedAttachments.length} archivo(s) cargado(s)`)
    } catch (error) {
      console.error('Attachment upload error:', error)
      toast.error('Error al cargar uno o más archivos')
    } finally {
      setAttachmentsUploading(false)
      if (attachmentsInputRef.current) {
        attachmentsInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAttachment = (indexToRemove: number) => {
    const updatedAttachments = bookingAttachments.filter((_, index) => index !== indexToRemove)
    updateFormData('bookingAttachments', updatedAttachments)
  }

  const handleGenerateTitleWithAI = useCallback(async (index: number, options?: { silent?: boolean }) => {
    const option = formData.pricingOptions[index]
    
    setAiLoadingIndex(index)
    try {
      const response = await fetch('/api/ai/generate-offer-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: option.description,
          price: option.price || '',
          realValue: option.realValue || '',
        }),
      })
      
      if (!response.ok) throw new Error('No se pudo generar el título.')
      
      const data = await response.json()
      if (data?.title) {
        updatePricingOption(index, 'title', data.title)
        if (!options?.silent) {
          toast.success('Título generado')
        }
      }
    } catch (error) {
      console.error('AI generate title error', error)
      if (!options?.silent) {
        toast.error('No se pudo generar el título')
      }
    } finally {
      setAiLoadingIndex(null)
    }
  }, [formData.pricingOptions, updatePricingOption])

  // Ensure pricingOptions is always an array
  const pricingOptions = useMemo(
    () => (Array.isArray(formData.pricingOptions) ? formData.pricingOptions : []),
    [formData.pricingOptions]
  )

  // Calculate margin breakdown for each option
  const marginPercent = parseFloat(formData.offerMargin || '0') || 0
  const optionsWithCalculation = pricingOptions.map((opt, idx) => {
    const price = parseFloat(opt.price || '0') || 0
    if (price > 0 && marginPercent > 0) {
      const osShare = (price * marginPercent) / 100
      const partnerShare = price - osShare
      return { idx, price, osShare, partnerShare, title: opt.title || opt.description || `Opción ${idx + 1}` }
    }
    return null
  }).filter(Boolean) as { idx: number; price: number; osShare: number; partnerShare: number; title: string }[]

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Estructura de la Oferta</h2>
          <p className="text-sm text-gray-500 mt-1">Defina las opciones de compra y precios para el cliente.</p>
        </div>
        <button
          onClick={addPricingOption}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 font-medium text-sm"
        >
          <AddIcon fontSize="small" />
          Agregar Opción
        </button>
      </div>

      {/* Offer Margin Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-auto md:min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <span>Comisión OfertaSimple</span>
              {isFieldRequired('offerMargin') ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
              )}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={formData.offerMargin || ''}
                onChange={(e) => updateFormData('offerMargin', e.target.value)}
                placeholder="10"
                min="0"
                max="100"
                step="1"
                className={`pr-8 font-medium text-gray-900 ${
                  errors.offerMargin ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
                }`}
                size="sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">%</span>
            </div>
            {errors.offerMargin && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.offerMargin}</p>
            )}
          </div>

          {/* Calculation Preview */}
          {optionsWithCalculation.length > 0 && (
            <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {optionsWithCalculation.map((calc) => (
                  <div key={calc.idx} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-xs">
                    <div className="font-medium text-gray-700 mb-1.5 truncate" title={calc.title}>
                      {calc.title.length > 30 ? calc.title.substring(0, 30) + '...' : calc.title}
                    </div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-gray-500">Precio Venta:</span>
                      <span className="font-semibold text-gray-900">${calc.price.toFixed(2)}</span>
                    </div>
                    <div className="space-y-0.5 pt-1.5 border-t border-gray-200 border-dashed">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-amber-600 font-medium">Comisión:</span>
                        <span className="text-amber-700 font-bold">${calc.osShare.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-green-600 font-medium">Recibe:</span>
                        <span className="text-green-700 font-bold">${calc.partnerShare.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {pricingOptions.map((option, index) => {
          const titleFormatIssue = getTitleFormatIssue(option.title)
          const titleError = errors[`pricingOptions.${index}.title`]
          const hasTitleIssue = Boolean(titleError || titleFormatIssue)

          return (
          <div key={index} className="bg-gray-50/50 border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all duration-300">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-gray-700">Opción de Compra {index + 1}</h3>
              </div>
              {pricingOptions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePricingOption(index)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors duration-200 hover:border-red-300 hover:bg-red-50"
                  title="Eliminar opción"
                >
                  <DeleteIcon fontSize="small" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <span>Título del producto o servicio</span>
                    {isFieldRequired('pricingOptions.title') ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                    )}
                  </label>
                  <Input
                    type="text"
                    value={option.title || ''}
                    onChange={(e) => updatePricingOption(index, 'title', e.target.value)}
                    placeholder="Ej: Masaje de espalda por 30 min"
                    size="sm"
                    className={hasTitleIssue ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                  />
                  {(titleError || titleFormatIssue) && (
                    <p className="text-xs text-red-600 font-medium mt-1">{titleError || titleFormatIssue}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 gap-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Restricciones o comentarios de la opción</span>
                      {isFieldRequired('pricingOptions.description') ? (
                        <span className="text-red-500">*</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                      )}
                    </label>
                    {SHOW_AI_OPTION_TITLE && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={aiLoadingIndex === index}
                        onClick={() => handleGenerateTitleWithAI(index)}
                        className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:text-white focus-visible:ring-purple-500 shadow-sm hover:shadow-md flex items-center gap-1.5 py-1 px-2 text-[10px]"
                      >
                        <AutoFixHighIcon style={{ fontSize: 14 }} />
                        {aiLoadingIndex === index ? 'Generando...' : 'Generar título con AI'}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={option.description}
                    onChange={(e) => updatePricingOption(index, 'description', e.target.value)}
                    rows={2}
                    placeholder="Ej: Válido hasta el 6 de marzo. No aplica feriados."
                    className={errors[`pricingOptions.${index}.description`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                  />
                  {errors[`pricingOptions.${index}.description`] && (
                    <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.description`]}</p>
                  )}
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <ImageIcon style={{ fontSize: 14 }} />
                    <span>Imagen de la Opción</span>
                    <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                  </label>
                  
                  {option.imageUrl ? (
                    <div className="relative group w-fit">
                      <button
                        type="button"
                        onClick={() => openLightbox([option.imageUrl!], 0)}
                        className="relative w-40 h-28 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-zoom-in hover:shadow-md transition-shadow"
                      >
                        <Image
                          src={option.imageUrl}
                          alt={`Imagen opción ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                          <ZoomInIcon className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" style={{ fontSize: 24 }} />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                        title="Eliminar imagen"
                      >
                        <CloseIcon style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        ref={(el) => { fileInputRefs.current[index] = el }}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(index, file)
                        }}
                        className="hidden"
                        id={`image-upload-${index}`}
                      />
                      <label
                        htmlFor={`image-upload-${index}`}
                        className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 ${
                          uploadingIndex === index ? 'opacity-60 pointer-events-none' : ''
                        }`}
                      >
                        {uploadingIndex === index ? (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-500">Cargando...</span>
                          </>
                        ) : (
                          <>
                            <CloudUploadIcon className="text-gray-400" style={{ fontSize: 20 }} />
                            <span className="text-sm text-gray-500">Subir imagen</span>
                          </>
                        )}
                      </label>
                      <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, GIF, WEBP · Máx. 25MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-4 space-y-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <span>Precio (Cliente Paga)</span>
                    {isFieldRequired('pricingOptions.price') ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                    <Input
                      type="number"
                      value={option.price}
                      onChange={(e) => updatePricingOption(index, 'price', e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className={`pl-8 pr-4 py-2 font-semibold text-gray-900 bg-blue-50/30 border-blue-100 ${
                        errors[`pricingOptions.${index}.price`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
                      }`}
                      size="sm"
                    />
                  </div>
                  {errors[`pricingOptions.${index}.price`] && (
                    <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.price`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <span>Valor Real</span>
                    {isFieldRequired('pricingOptions.realValue') ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={option.realValue}
                      onChange={(e) => updatePricingOption(index, 'realValue', e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className={`pl-8 pr-4 py-2 ${
                        (option.price && option.realValue && 
                        parseFloat(option.realValue) > 0 && parseFloat(option.price) > 0 &&
                        parseFloat(option.realValue) <= parseFloat(option.price)) ||
                        errors[`pricingOptions.${index}.realValue`]
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : ''
                      }`}
                      size="sm"
                    />
                  </div>
                  {/* Discount percentage calculation and validation */}
                  {option.price && option.realValue && 
                   parseFloat(option.price) > 0 && parseFloat(option.realValue) > 0 && (
                    <div className="mt-1.5">
                      {parseFloat(option.realValue) <= parseFloat(option.price) || errors[`pricingOptions.${index}.realValue`] ? (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <span>⚠️</span>
                          <span>{errors[`pricingOptions.${index}.realValue`] || 'El valor real debe ser mayor que el precio'}</span>
                        </p>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-md shadow-sm">
                          <span className="text-xs font-extrabold text-green-700 tracking-wide">
                            {Math.round(((parseFloat(option.realValue) - parseFloat(option.price)) / parseFloat(option.realValue)) * 100)}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {errors[`pricingOptions.${index}.realValue`] && (!option.price || !option.realValue || parseFloat(option.price) <= 0 || parseFloat(option.realValue) <= 0) && (
                    <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.realValue`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <span>Cantidad</span>
                    {isFieldRequired('pricingOptions.quantity') ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                    )}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={option.quantity}
                      onChange={(e) => updatePricingOption(index, 'quantity', e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="∞"
                      min="1"
                      step="1"
                      size="sm"
                      className={errors[`pricingOptions.${index}.quantity`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                    />
                    <button
                      type="button"
                      onClick={() => updatePricingOption(index, 'quantity', '')}
                      className={`shrink-0 p-1.5 rounded-lg border transition-all duration-150 ${
                        !option.quantity
                          ? 'bg-blue-50 border-blue-300 text-blue-600'
                          : 'bg-white border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      title="Ilimitado"
                    >
                      <AllInclusiveIcon style={{ fontSize: 16 }} />
                    </button>
                  </div>
                  {errors[`pricingOptions.${index}.quantity`] && (
                    <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.quantity`]}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <span>Max Usuario</span>
                      {isFieldRequired('pricingOptions.limitByUser') ? (
                        <span className="text-red-500 ml-1">*</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-normal ml-1">(Opcional)</span>
                      )}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={option.limitByUser || ''}
                        onChange={(e) => updatePricingOption(index, 'limitByUser', e.target.value)}
                        placeholder="∞"
                        min="1"
                        size="sm"
                        className={errors[`pricingOptions.${index}.limitByUser`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => updatePricingOption(index, 'limitByUser', '')}
                        className={`shrink-0 p-1.5 rounded-lg border transition-all duration-150 ${
                          !option.limitByUser
                            ? 'bg-blue-50 border-blue-300 text-blue-600'
                            : 'bg-white border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                        title="Ilimitado"
                      >
                        <AllInclusiveIcon style={{ fontSize: 16 }} />
                      </button>
                    </div>
                    {errors[`pricingOptions.${index}.limitByUser`] && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.limitByUser`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <span>Max Regalo</span>
                      {isFieldRequired('pricingOptions.maxGiftsPerUser') ? (
                        <span className="text-red-500 ml-1">*</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-normal ml-1">(Opcional)</span>
                      )}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={option.maxGiftsPerUser || ''}
                        onChange={(e) => updatePricingOption(index, 'maxGiftsPerUser', e.target.value)}
                        placeholder="∞"
                        min="1"
                        size="sm"
                        className={errors[`pricingOptions.${index}.maxGiftsPerUser`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => updatePricingOption(index, 'maxGiftsPerUser', '')}
                        className={`shrink-0 p-1.5 rounded-lg border transition-all duration-150 ${
                          !option.maxGiftsPerUser
                            ? 'bg-blue-50 border-blue-300 text-blue-600'
                            : 'bg-white border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                        title="Ilimitado"
                      >
                        <AllInclusiveIcon style={{ fontSize: 16 }} />
                      </button>
                    </div>
                    {errors[`pricingOptions.${index}.maxGiftsPerUser`] && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.maxGiftsPerUser`]}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <span>Fecha fin de opción</span>
                    {isFieldRequired('pricingOptions.endAt') ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                    )}
                  </label>
                  <Input
                    type="date"
                    value={option.endAt || ''}
                    onChange={(e) => updatePricingOption(index, 'endAt', e.target.value)}
                    size="sm"
                    className={errors[`pricingOptions.${index}.endAt`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                  />
                  {errors[`pricingOptions.${index}.endAt`] && (
                    <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.endAt`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <span>Vencimiento voucher (días)</span>
                    {isFieldRequired('pricingOptions.expiresIn') ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                    )}
                  </label>
                  <Input
                    type="number"
                    value={option.expiresIn || ''}
                    onChange={(e) => updatePricingOption(index, 'expiresIn', e.target.value)}
                    placeholder="Ej: 90"
                    min="1"
                    size="sm"
                    className={errors[`pricingOptions.${index}.expiresIn`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                  />
                  {errors[`pricingOptions.${index}.expiresIn`] ? (
                    <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.expiresIn`]}</p>
                  ) : (
                    <p className="text-[10px] text-gray-400 mt-1">Días desde compra hasta vencimiento</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          )
        })}
        
        <div className="flex justify-center pt-4">
          <button
            onClick={addPricingOption}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex flex-col items-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
              <AddIcon />
            </div>
            <span className="font-medium">Agregar otra opción de compra</span>
          </button>
        </div>
        
        {errors.pricingOptions && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span className="font-bold">!</span> {errors.pricingOptions}
          </div>
        )}
      </div>

      {/* Attachments and Image Assets */}
      <div className="mt-12 pt-10 border-t border-gray-200">
        <div className="mb-6 flex items-start gap-3">
          <div className="p-2.5 bg-slate-100 rounded-xl">
            <AttachFileIcon className="text-slate-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Adjuntos e imágenes</h3>
            <p className="text-sm text-gray-500">
              Sección separada para recursos visuales del deal y documentos de respaldo del negocio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Deal image gallery */}
          <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CollectionsIcon className="text-purple-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                    Galería del deal
                    {isFieldRequired('dealImages') && <span className="text-red-500">*</span>}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Imágenes principales que se usarán para publicar la oferta.
                  </p>
                </div>
              </div>
              {dealImages.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                  {dealImages.length} imagen{dealImages.length !== 1 ? 'es' : ''}
                </span>
              )}
            </div>

            {dealImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {dealImages
                  .sort((a, b) => a.order - b.order)
                  .map((image, idx, sortedArr) => (
                    <div 
                      key={image.url} 
                      className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => openLightbox(sortedArr.map(img => img.url), idx)}
                        className="absolute inset-0 cursor-zoom-in"
                      >
                        <Image
                          src={image.url}
                          alt={`Imagen ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        />
                      </button>
                      
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none" />
                      
                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openLightbox(sortedArr.map(img => img.url), idx)}
                          className="p-2 bg-white text-gray-700 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                          title="Ver imagen"
                        >
                          <ZoomInIcon style={{ fontSize: 18 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(image.url)}
                          className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          title="Eliminar imagen"
                        >
                          <CloseIcon style={{ fontSize: 16 }} />
                        </button>
                      </div>
                      
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
                        {idx + 1}
                      </div>
                      
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveGalleryImageLeft(image.url)}
                          disabled={idx === 0}
                          className={`p-1.5 rounded-full shadow-lg transition-colors ${
                            idx === 0 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Mover a la izquierda"
                        >
                          <ArrowBackIcon style={{ fontSize: 14 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGalleryImageRight(image.url)}
                          disabled={idx === sortedArr.length - 1}
                          className={`p-1.5 rounded-full shadow-lg transition-colors ${
                            idx === sortedArr.length - 1 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Mover a la derecha"
                        >
                          <ArrowForwardIcon style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                <p className="text-sm text-gray-500">Todavía no has agregado imágenes al deal.</p>
              </div>
            )}

            <div className="relative">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length > 0) handleGalleryUpload(files)
                }}
                className="hidden"
                id="gallery-upload"
              />
              <label
                htmlFor="gallery-upload"
                className={`flex flex-col items-center gap-3 px-6 py-7 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-200 ${
                  galleryUploading ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {galleryUploading ? (
                  <>
                    <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Cargando imágenes...</span>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <CloudUploadIcon className="text-purple-500" style={{ fontSize: 28 }} />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium text-gray-700">
                        Arrastra imágenes aquí o haz clic para seleccionar
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        JPG, PNG, GIF, WEBP · Máx. 25MB cada una · Puedes seleccionar múltiples
                      </p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </section>

          {/* Generic attachments */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DescriptionIcon className="text-blue-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Adjuntos</h4>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX o imágenes de referencia.</p>
                </div>
              </div>
              {bookingAttachments.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                  {bookingAttachments.length}
                </span>
              )}
            </div>

            {bookingAttachments.length > 0 ? (
              <div className="space-y-2.5 mb-4 max-h-[360px] overflow-y-auto pr-1">
                {bookingAttachments.map((attachment, index) => {
                  const kind = getAttachmentKind(attachment)
                  return (
                    <div
                      key={`${attachment.url}-${index}`}
                      className="group rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                          title="Abrir archivo"
                        >
                          {kind === 'image' ? (
                            <Image
                              src={attachment.url}
                              alt={attachment.filename || 'Adjunto'}
                              width={44}
                              height={44}
                              className="h-11 w-11 rounded-md object-cover border border-gray-200"
                              unoptimized
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-md border border-gray-200 bg-white flex items-center justify-center">
                              {kind === 'pdf' ? (
                                <PictureAsPdfIcon className="text-red-500" />
                              ) : kind === 'doc' ? (
                                <DescriptionIcon className="text-blue-500" />
                              ) : (
                                <AttachFileIcon className="text-gray-500" />
                              )}
                            </div>
                          )}
                        </a>

                        <div className="min-w-0 flex-1">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-sm font-medium text-gray-900 hover:text-blue-600"
                            title={attachment.filename}
                          >
                            {attachment.filename || `Archivo ${index + 1}`}
                          </a>
                          <p className="text-xs text-gray-500">
                            {getAttachmentTypeLabel(attachment.mimeType || '', attachment.filename || '')} · {formatFileSize(attachment.size || 0)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar adjunto"
                        >
                          <CloseIcon style={{ fontSize: 16 }} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                <p className="text-sm text-gray-500">No hay adjuntos todavía.</p>
              </div>
            )}

            <div className="relative">
              <input
                ref={attachmentsInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx,.pdf"
                multiple
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length > 0) handleAttachmentUpload(files)
                }}
                className="hidden"
                id="attachments-upload"
              />
              <label
                htmlFor="attachments-upload"
                className={`flex flex-col items-center gap-3 px-4 py-6 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all duration-200 ${
                  attachmentsUploading ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {attachmentsUploading ? (
                  <>
                    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Cargando adjuntos...</span>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 bg-blue-100 rounded-full">
                      <CloudUploadIcon className="text-blue-600" style={{ fontSize: 24 }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Subir adjuntos</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX e imágenes · Máx. 25MB por archivo</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </section>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}
