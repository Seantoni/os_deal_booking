import { useState, useRef } from 'react'
import Image from 'next/image'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import InfoIcon from '@mui/icons-material/Info'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ImageIcon from '@mui/icons-material/Image'
import CloseIcon from '@mui/icons-material/Close'
import CollectionsIcon from '@mui/icons-material/Collections'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import type { BookingFormData } from '../types'
import { Input, Textarea, Button } from '@/components/ui'
import toast from 'react-hot-toast'
import { compressImage, compressImages } from '@/lib/utils/image-compression'
import ImageLightbox from '@/components/common/ImageLightbox'

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

  const handleImageUpload = async (index: number, file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor, selecciona una imagen válida (JPG, PNG, GIF, WEBP)')
      return
    }

    // Validate file size (max 10MB before compression)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('La imagen no puede superar los 10MB')
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

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)

  const dealImages = Array.isArray(formData.dealImages) ? formData.dealImages : []

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
    const maxSize = 10 * 1024 * 1024 // 10MB before compression

    const validFiles = Array.from(files).filter(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Formato no válido`)
        return false
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: Excede 10MB`)
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

  const handleGenerateTitleWithAI = async (index: number) => {
    const option = formData.pricingOptions[index]
    if (!option.description?.trim()) return
    
    setAiLoadingIndex(index)
    try {
      const response = await fetch('/api/ai/generate-offer-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: option.description,
          price: option.price || '0',
          realValue: option.realValue || '',
          businessName: formData.businessName || '',
        }),
      })
      
      if (!response.ok) throw new Error('No se pudo generar el título.')
      
      const data = await response.json()
      if (data?.title) {
        updatePricingOption(index, 'title', data.title)
      }
    } catch (error) {
      console.error('AI generate title error', error)
    } finally {
      setAiLoadingIndex(null)
    }
  }

  // Ensure pricingOptions is always an array
  const pricingOptions = Array.isArray(formData.pricingOptions) 
    ? formData.pricingOptions 
    : []

  // Calculate margin breakdown for each option
  const marginPercent = parseFloat(formData.offerMargin || '0') || 0
  const optionsWithCalculation = pricingOptions.map((opt, idx) => {
    const price = parseFloat(opt.price || '0') || 0
    if (price > 0 && marginPercent > 0) {
      const osShare = (price * marginPercent) / 100
      const partnerShare = price - osShare
      return { idx, price, osShare, partnerShare, title: opt.title || `Opción ${idx + 1}` }
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
        {pricingOptions.map((option, index) => (
          <div key={index} className="bg-gray-50/50 border border-gray-200 rounded-2xl p-6 relative hover:shadow-md transition-all duration-300 group">
            {pricingOptions.length > 1 && (
              <button
                onClick={() => removePricingOption(index)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                title="Eliminar opción"
              >
                <DeleteIcon fontSize="small" />
              </button>
            )}
            
            <div className="mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                {index + 1}
              </span>
              <h3 className="font-semibold text-gray-700">Opción de Compra {index + 1}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Título de Opción</span>
                      {isFieldRequired('pricingOptions.title') ? (
                        <span className="text-red-500">*</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                      )}
                    </label>
                    {option.description?.trim() && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={aiLoadingIndex === index}
                        onClick={() => handleGenerateTitleWithAI(index)}
                        className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:text-white focus-visible:ring-purple-500 shadow-sm hover:shadow-md flex items-center gap-1.5 py-1 px-2 text-[10px]"
                      >
                        <AutoFixHighIcon style={{ fontSize: 14 }} />
                        {aiLoadingIndex === index ? 'Generando...' : 'Generar con AI'}
                      </Button>
                    )}
                  </div>
                  <Input
                    value={option.title}
                    onChange={(e) => updatePricingOption(index, 'title', e.target.value)}
                    placeholder='Ej: "Paga $7 por menú completo en Restaurante. Valor $15"'
                    size="sm"
                    className={errors[`pricingOptions.${index}.title`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                  />
                  {errors[`pricingOptions.${index}.title`] && (
                    <p className="text-xs text-red-600 font-medium mt-1">{errors[`pricingOptions.${index}.title`]}</p>
                  )}
                  {!option.description?.trim() && !errors[`pricingOptions.${index}.title`] && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <InfoIcon style={{ fontSize: 12 }} />
                      <span>Completa la descripción para generar el título con AI</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <span>Descripción (Detalles incluidos)</span>
                    {isFieldRequired('pricingOptions.description') ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                    )}
                  </label>
                  <Textarea
                    value={option.description}
                    onChange={(e) => updatePricingOption(index, 'description', e.target.value)}
                    rows={2}
                    placeholder="Detalles incluidos en esta opción..."
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
                      <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, GIF, WEBP · Máx. 5MB</p>
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
                  <Input
                    value={option.quantity}
                    onChange={(e) => updatePricingOption(index, 'quantity', e.target.value)}
                    placeholder="Ilimitado"
                    size="sm"
                    className={errors[`pricingOptions.${index}.quantity`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                  />
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
                    <Input
                      type="number"
                      value={option.limitByUser || ''}
                      onChange={(e) => updatePricingOption(index, 'limitByUser', e.target.value)}
                      placeholder="∞"
                      min="1"
                      size="sm"
                      className={errors[`pricingOptions.${index}.limitByUser`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                    />
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
                    <Input
                      type="number"
                      value={option.maxGiftsPerUser || ''}
                      onChange={(e) => updatePricingOption(index, 'maxGiftsPerUser', e.target.value)}
                      placeholder="∞"
                      min="1"
                      size="sm"
                      className={errors[`pricingOptions.${index}.maxGiftsPerUser`] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
                    />
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
        ))}
        
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

      {/* Deal Images Gallery Section */}
      <div className="mt-10 pt-8 border-t border-gray-200">
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CollectionsIcon className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Galería de Imágenes</h3>
              <p className="text-sm text-gray-500">Agrega imágenes generales de la oferta (opcional)</p>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {dealImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
            {dealImages
              .sort((a, b) => a.order - b.order)
              .map((image, idx, sortedArr) => (
                <div 
                  key={image.url} 
                  className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Clickable image */}
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
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                    />
                  </button>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none" />
                  
                  {/* Action buttons */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* View button */}
                    <button
                      type="button"
                      onClick={() => openLightbox(sortedArr.map(img => img.url), idx)}
                      className="p-2 bg-white text-gray-700 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                      title="Ver imagen"
                    >
                      <ZoomInIcon style={{ fontSize: 18 }} />
                    </button>
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(image.url)}
                      className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      title="Eliminar imagen"
                    >
                      <CloseIcon style={{ fontSize: 16 }} />
                    </button>
                  </div>
                  
                  {/* Order badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
                    {idx + 1}
                  </div>
                  
                  {/* Reorder buttons */}
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
        )}

        {/* Upload Area */}
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
            className={`flex flex-col items-center gap-3 px-6 py-8 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-200 ${
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
                    JPG, PNG, GIF, WEBP · Máx. 5MB cada una · Puedes seleccionar múltiples
                  </p>
                </div>
              </>
            )}
          </label>
        </div>

        {dealImages.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            {dealImages.length} imagen{dealImages.length !== 1 ? 'es' : ''} en la galería
          </p>
        )}
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

