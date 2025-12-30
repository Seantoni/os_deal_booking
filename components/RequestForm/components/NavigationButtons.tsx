import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveIcon from '@mui/icons-material/Save'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { StepConfig } from '../constants'
import { Button } from '@/components/ui'

interface NavigationButtonsProps {
  currentStepIndex: number
  totalSteps: number
  saving: boolean
  onPrevious: () => void
  onNext: () => void
  onSaveDraft: () => void
  onSubmit: () => void
  onGoBack?: () => void // Optional handler for going back to previous page
}

export default function NavigationButtons({
  currentStepIndex,
  totalSteps,
  saving,
  onPrevious,
  onNext,
  onSaveDraft,
  onSubmit,
  onGoBack
}: NavigationButtonsProps) {
  return (
    <div className="px-4 py-4 md:px-8 md:pb-8 bg-gray-50 md:rounded-b-2xl border-t border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-0 md:shadow-inner">
      {/* Back/Previous Button */}
      <div className="order-2 sm:order-1">
        {currentStepIndex === 0 && onGoBack ? (
          <Button
            variant="secondary"
            onClick={onGoBack}
            size="sm"
            className="w-full sm:w-auto flex items-center justify-center gap-2"
            leftIcon={<ArrowBackIcon style={{ fontSize: 18 }} />}
          >
            <span className="hidden sm:inline">Volver</span>
            <span className="sm:hidden">Volver</span>
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={onPrevious}
            disabled={currentStepIndex === 0}
            size="sm"
            className="w-full sm:w-auto flex items-center justify-center gap-2"
            leftIcon={<ArrowBackIcon style={{ fontSize: 18 }} />}
          >
            <span className="hidden sm:inline">Anterior</span>
            <span className="sm:hidden">Atrás</span>
          </Button>
        )}
      </div>

      {/* Primary Actions */}
      <div className="flex gap-2 sm:gap-4 order-1 sm:order-2">
        {/* Save Draft - Icon only on mobile */}
        <Button
          variant="secondary"
          onClick={onSaveDraft}
          disabled={saving}
          size="sm"
          className="flex-1 sm:flex-none flex items-center justify-center gap-2"
          leftIcon={<SaveIcon style={{ fontSize: 18 }} />}
        >
          <span className="hidden md:inline">{saving ? 'Guardando...' : 'Guardar Borrador'}</span>
          <span className="md:hidden">{saving ? '...' : 'Guardar'}</span>
        </Button>

        {/* Next/Submit Button */}
        {currentStepIndex < totalSteps - 1 ? (
          <Button
            onClick={onNext}
            size="sm"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] transition-all duration-200"
            rightIcon={<ArrowForwardIcon style={{ fontSize: 18 }} />}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={saving}
            size="sm"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg shadow-green-200 hover:shadow-green-300 active:scale-[0.98] disabled:opacity-70 transition-all duration-200"
            leftIcon={<CheckCircleIcon style={{ fontSize: 18 }} />}
          >
            <span className="hidden sm:inline">{saving ? 'Enviando...' : 'Enviar Solicitud'}</span>
            <span className="sm:hidden">{saving ? '...' : 'Enviar'}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

