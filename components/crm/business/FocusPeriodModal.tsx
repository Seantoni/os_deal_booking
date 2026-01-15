'use client'

import { useState, useTransition } from 'react'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DateRangeIcon from '@mui/icons-material/DateRange'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ClearIcon from '@mui/icons-material/Clear'
import { Button } from '@/components/ui'
import { updateBusinessFocus } from '@/app/actions/businesses'
import { 
  type FocusPeriod, 
  FOCUS_PERIOD_OPTIONS,
  getActiveFocus,
  getFocusInfo,
  formatExpirationDate 
} from '@/lib/utils/focus-period'
import toast from 'react-hot-toast'

interface FocusPeriodModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  businessName: string
  currentFocusPeriod?: string | null
  currentFocusSetAt?: Date | string | null
  onSuccess?: (updatedFocus: FocusPeriod | null) => void
}

const FOCUS_ICONS: Record<FocusPeriod, React.ReactNode> = {
  month: <CalendarMonthIcon style={{ fontSize: 20 }} />,
  quarter: <DateRangeIcon style={{ fontSize: 20 }} />,
  year: <CalendarTodayIcon style={{ fontSize: 20 }} />,
}

export default function FocusPeriodModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  currentFocusPeriod,
  currentFocusSetAt,
  onSuccess,
}: FocusPeriodModalProps) {
  const [isPending, startTransition] = useTransition()
  
  // Get current active focus (considering expiration)
  const activeFocus = getActiveFocus({ focusPeriod: currentFocusPeriod, focusSetAt: currentFocusSetAt })
  const focusInfo = getFocusInfo({ focusPeriod: currentFocusPeriod, focusSetAt: currentFocusSetAt })
  
  const [selectedPeriod, setSelectedPeriod] = useState<FocusPeriod | null>(activeFocus)

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateBusinessFocus(businessId, selectedPeriod)
      
      if (result.success) {
        toast.success(
          selectedPeriod 
            ? `Foco "${FOCUS_PERIOD_OPTIONS.find(o => o.value === selectedPeriod)?.label}" establecido para ${businessName}`
            : `Foco eliminado de ${businessName}`
        )
        onSuccess?.(selectedPeriod)
        onClose()
      } else {
        toast.error(result.error || 'Error al actualizar el foco')
      }
    })
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <CenterFocusStrongIcon />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Establecer Foco</h3>
              <p className="text-sm text-gray-500 truncate max-w-[280px]">{businessName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Current status */}
          {focusInfo.isActive && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Foco actual:</span> {focusInfo.label}
                {focusInfo.expiresAt && (
                  <span className="text-amber-600">
                    {' '}(expira {formatExpirationDate(focusInfo.expiresAt)}, {focusInfo.daysRemaining} días restantes)
                  </span>
                )}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-4">
            Selecciona el período de foco para este negocio. El foco expira automáticamente al final del período seleccionado.
          </p>

          {/* Options */}
          <div className="space-y-2">
            {FOCUS_PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedPeriod(option.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  selectedPeriod === option.value
                    ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className={selectedPeriod === option.value ? 'text-amber-500' : 'text-gray-400'}>
                  {FOCUS_ICONS[option.value]}
                </span>
                <span className="font-medium">{option.label}</span>
                {option.value === 'month' && (
                  <span className="ml-auto text-xs text-gray-400">Este mes</span>
                )}
                {option.value === 'quarter' && (
                  <span className="ml-auto text-xs text-gray-400">Este trimestre</span>
                )}
                {option.value === 'year' && (
                  <span className="ml-auto text-xs text-gray-400">Este año</span>
                )}
              </button>
            ))}

            {/* Clear option */}
            <button
              type="button"
              onClick={() => setSelectedPeriod(null)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                selectedPeriod === null
                  ? 'border-gray-400 bg-gray-100 text-gray-700 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500'
              }`}
            >
              <span className={selectedPeriod === null ? 'text-gray-500' : 'text-gray-400'}>
                <ClearIcon style={{ fontSize: 20 }} />
              </span>
              <span className="font-medium">Sin foco</span>
              <span className="ml-auto text-xs text-gray-400">Quitar foco</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || selectedPeriod === activeFocus}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
