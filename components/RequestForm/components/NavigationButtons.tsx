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
  hasErrors?: boolean // Whether the current step has validation errors
}

export default function NavigationButtons({
  currentStepIndex,
  totalSteps,
  saving,
  onPrevious,
  onNext,
  onSaveDraft,
  onSubmit,
  onGoBack,
  hasErrors
}: NavigationButtonsProps) {
  return (
    <div className="px-4 py-4 md:px-8 md:pb-8 bg-gray-50 md:rounded-b-2xl border-t border-gray-100 flex flex-col gap-3 mt-0 md:shadow-inner">
      {/* Validation Warning */}
      {hasErrors && (
        <p className="text-xs text-amber-600 flex items-center justify-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Por favor, complete todos los campos requeridos (marcados con *) para continuar
        </p>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
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
    </div>
  )
}

