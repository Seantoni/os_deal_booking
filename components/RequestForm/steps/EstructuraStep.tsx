import { useState, useRef } from 'react'
import Image from 'next/image'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import InfoIcon from '@mui/icons-material/Info'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ImageIcon from '@mui/icons-material/Image'
import CloseIcon from '@mui/icons-material/Close'
import type { BookingFormData } from '../types'
import { Input, Textarea, Button } from '@/components/ui'
import toast from 'react-hot-toast'

interface EstructuraStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: any) => void
  addPricingOption: () => void
  removePricingOption: (index: number) => void
  updatePricingOption: (index: number, field: string, value: string) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function EstructuraStep({ 
  formData, 
  errors, 
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

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('La imagen no puede superar los 5MB')
      return
    }

    setUploadingIndex(index)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'deal-images')
      formData.append('isPublic', 'true')

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
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

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estructura de la Oferta</h2>
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
                      {isFieldRequired('pricingOptions') ? (
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
                  />
                  {!option.description?.trim() && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <InfoIcon style={{ fontSize: 12 }} />
                      <span>Completa la descripción para generar el título con AI</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <span>Descripción (Detalles incluidos)</span>
                    <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                  </label>
                  <Textarea
                    value={option.description}
                    onChange={(e) => updatePricingOption(index, 'description', e.target.value)}
                    rows={2}
                    placeholder="Detalles incluidos en esta opción..."
                  />
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
                      <div className="relative w-40 h-28 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <Image
                          src={option.imageUrl}
                          alt={`Imagen opción ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
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
                    {isFieldRequired('pricingOptions') ? (
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
                    <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
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
                    <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                  </label>
                  <Input
                    value={option.quantity}
                    onChange={(e) => updatePricingOption(index, 'quantity', e.target.value)}
                    placeholder="Ilimitado"
                    size="sm"
                  />
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
    </div>
  )
}

