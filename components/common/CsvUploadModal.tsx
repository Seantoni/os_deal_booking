'use client'

import { useState, useRef, useCallback } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import { useModalEscape } from '@/hooks/useModalEscape'
import { Button } from '@/components/ui'
import { parseCsv, type ParsedCsvRow } from '@/lib/utils/csv-export'

export interface CsvUploadPreview {
  toCreate: number
  toUpdate: number
  skipped: number
  errors: string[]
  rows: ParsedCsvRow[]
}

export interface CsvUploadResult {
  created: number
  updated: number
  errors: string[]
}

interface CsvUploadModalProps {
  isOpen: boolean
  onClose: () => void
  entityName: string
  expectedHeaders: string[]
  idField: string // Header name for ID field (e.g., 'ID')
  onPreview: (rows: ParsedCsvRow[]) => Promise<CsvUploadPreview>
  onConfirm: (rows: ParsedCsvRow[]) => Promise<CsvUploadResult>
}

type UploadStep = 'select' | 'preview' | 'processing' | 'complete'

export default function CsvUploadModal({
  isOpen,
  onClose,
  entityName,
  expectedHeaders,
  idField,
  onPreview,
  onConfirm,
}: CsvUploadModalProps) {
  const [step, setStep] = useState<UploadStep>('select')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvUploadPreview | null>(null)
  const [result, setResult] = useState<CsvUploadResult | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setStep('select')
    setFile(null)
    setPreview(null)
    setResult(null)
    setParseErrors([])
    setLoading(false)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

  // Close modal on Escape key
  useModalEscape(isOpen, handleClose)

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setLoading(true)
    setParseErrors([])

    try {
      const content = await selectedFile.text()
      const { headers, rows, errors } = parseCsv(content)

      if (errors.length > 0) {
        setParseErrors(errors)
        setLoading(false)
        return
      }

      // Check if all expected headers are present
      const missingHeaders = expectedHeaders.filter(
        expected => !headers.some(h => h.toLowerCase() === expected.toLowerCase())
      )

      if (missingHeaders.length > 0) {
        setParseErrors([`Faltan columnas requeridas: ${missingHeaders.join(', ')}`])
        setLoading(false)
        return
      }

      // Get preview from parent
      const previewResult = await onPreview(rows)
      setPreview(previewResult)
      setStep('preview')
    } catch (error) {
      setParseErrors([`Error al leer el archivo: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setLoading(false)
    }
  }, [expectedHeaders, onPreview])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      handleFileSelect(droppedFile)
    } else {
      setParseErrors(['Por favor, seleccione un archivo CSV válido'])
    }
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }, [handleFileSelect])

  const handleConfirm = useCallback(async () => {
    if (!preview) return

    setStep('processing')
    setLoading(true)

    try {
      const uploadResult = await onConfirm(preview.rows)
      setResult(uploadResult)
      setStep('complete')
    } catch (error) {
      setResult({
        created: 0,
        updated: 0,
        errors: [`Error al procesar: ${error instanceof Error ? error.message : 'Unknown error'}`]
      })
      setStep('complete')
    } finally {
      setLoading(false)
    }
  }, [preview, onConfirm])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Importar {entityName}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <CloseIcon style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {/* Step: Select File */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-colors hover:border-blue-400 hover:bg-blue-50/50
                  ${loading ? 'border-gray-300 bg-gray-50' : 'border-gray-300'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                    <p className="text-sm text-gray-600">Analizando archivo...</p>
                  </div>
                ) : (
                  <>
                    <UploadFileIcon className="mx-auto text-gray-400 mb-3" style={{ fontSize: 48 }} />
                    <p className="text-sm font-medium text-gray-700">
                      Arrastra un archivo CSV aquí
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      o haz clic para seleccionar
                    </p>
                  </>
                )}
              </div>

              {/* Expected format info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Formato esperado:</p>
                <p className="text-xs text-gray-600">
                  El archivo debe contener las columnas: <span className="font-mono">{expectedHeaders.join(', ')}</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  • Si la columna <span className="font-mono">{idField}</span> tiene un valor, el registro será actualizado.
                </p>
                <p className="text-xs text-gray-500">
                  • Si la columna <span className="font-mono">{idField}</span> está vacía, se creará un nuevo registro.
                </p>
              </div>

              {/* Parse errors */}
              {parseErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <ErrorIcon className="text-red-500 flex-shrink-0" style={{ fontSize: 18 }} />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error al procesar el archivo</p>
                      <ul className="text-xs text-red-700 mt-1 space-y-0.5">
                        {parseErrors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{preview.toCreate}</p>
                  <p className="text-xs text-green-600">Nuevos</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{preview.toUpdate}</p>
                  <p className="text-xs text-blue-600">Actualizar</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{preview.skipped}</p>
                  <p className="text-xs text-gray-600">Omitidos</p>
                </div>
              </div>

              {/* File info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <UploadFileIcon style={{ fontSize: 18 }} />
                <span className="truncate">{file?.name}</span>
                <span className="text-gray-400">•</span>
                <span>{preview.rows.length} filas</span>
              </div>

              {/* Warnings/Errors */}
              {preview.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-h-40 overflow-auto">
                  <div className="flex items-start gap-2">
                    <WarningIcon className="text-amber-500 flex-shrink-0" style={{ fontSize: 18 }} />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        {preview.errors.length} advertencia(s)
                      </p>
                      <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                        {preview.errors.slice(0, 10).map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                        {preview.errors.length > 10 && (
                          <li className="text-amber-600">
                            ... y {preview.errors.length - 10} más
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ¿Desea continuar con la importación de <strong>{preview.toCreate + preview.toUpdate}</strong> registros?
                </p>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
              <p className="text-sm text-gray-600">Procesando importación...</p>
              <p className="text-xs text-gray-500 mt-1">Por favor, no cierre esta ventana</p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && result && (
            <div className="space-y-4">
              {/* Success/Error icon */}
              <div className="text-center py-4">
                {result.errors.length === 0 ? (
                  <CheckCircleIcon className="text-green-500" style={{ fontSize: 64 }} />
                ) : result.created + result.updated > 0 ? (
                  <WarningIcon className="text-amber-500" style={{ fontSize: 64 }} />
                ) : (
                  <ErrorIcon className="text-red-500" style={{ fontSize: 64 }} />
                )}
              </div>

              {/* Results summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600">Creados</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                  <p className="text-xs text-blue-600">Actualizados</p>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-auto">
                  <div className="flex items-start gap-2">
                    <ErrorIcon className="text-red-500 flex-shrink-0" style={{ fontSize: 18 }} />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {result.errors.length} error(es)
                      </p>
                      <ul className="text-xs text-red-700 mt-1 space-y-0.5">
                        {result.errors.slice(0, 10).map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li className="text-red-600">
                            ... y {result.errors.length - 10} más
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success message */}
              {result.created + result.updated > 0 && result.errors.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 text-center">
                    Importación completada exitosamente
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
          {step === 'select' && (
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="secondary" onClick={resetState}>
                Volver
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={!preview || (preview.toCreate + preview.toUpdate === 0)}
              >
                Confirmar Importación
              </Button>
            </>
          )}
          
          {step === 'complete' && (
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

