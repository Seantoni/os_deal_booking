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
    <div className="px-8 pb-8 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex justify-between items-center mt-0 shadow-inner">
      {currentStepIndex === 0 && onGoBack ? (
        <Button
          variant="secondary"
          onClick={onGoBack}
          className="flex items-center gap-2"
          leftIcon={<ArrowBackIcon fontSize="small" />}
        >
          Volver
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={onPrevious}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-2"
          leftIcon={<ArrowBackIcon fontSize="small" />}
        >
          Anterior
        </Button>
      )}

      <div className="flex gap-4">
        <Button
          variant="secondary"
          onClick={onSaveDraft}
          disabled={saving}
          className="flex items-center gap-2"
          leftIcon={<SaveIcon fontSize="small" />}
        >
          {saving ? 'Guardando...' : 'Guardar Borrador'}
        </Button>

        {currentStepIndex < totalSteps - 1 ? (
          <Button
            onClick={onNext}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            leftIcon={<ArrowForwardIcon fontSize="small" />}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:transform-none transition-all duration-200"
            leftIcon={<CheckCircleIcon fontSize="small" />}
          >
            {saving ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        )}
      </div>
    </div>
  )
}

