'use client'

interface FullScreenLoaderProps {
  /** Whether the loader is visible */
  isLoading: boolean
  /** Primary message (e.g., "Enviando solicitud...") */
  message: string
  /** Optional secondary message (e.g., "Procesando email y sincronizando datos") */
  subtitle?: string
}

/**
 * Full-screen loading overlay with centered spinner and message.
 * Blocks all interaction while a long-running operation is processing.
 * 
 * @example
 * <FullScreenLoader
 *   isLoading={isPending}
 *   message="Enviando solicitud..."
 *   subtitle="Procesando email y sincronizando datos"
 * />
 */
export default function FullScreenLoader({ isLoading, message, subtitle }: FullScreenLoaderProps) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-xs mx-4">
        <div className="animate-spin h-8 w-8 border-[3px] border-blue-500 border-t-transparent rounded-full" />
        <div className="text-center">
          <p className="text-gray-900 font-semibold text-sm">{message}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
