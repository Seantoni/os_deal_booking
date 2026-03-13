import type { StepConfig } from '../constants'

interface ProgressBarProps {
  steps: StepConfig[]
  currentStepKey: string
  onStepClick: (stepKey: string) => void
}

export default function ProgressBar({ steps, currentStepKey, onStepClick }: ProgressBarProps) {
  const currentStepIndex = steps.findIndex(step => step.key === currentStepKey)
  const progress = ((currentStepIndex + 1) / steps.length) * 100
  const currentStep = steps[currentStepIndex]

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.06),0_16px_36px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 w-full h-1 md:h-1.5 bg-gray-100">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="p-4 md:p-5 pt-5 md:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
              {currentStep && <currentStep.icon style={{ fontSize: 22 }} />}
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Paso {currentStepIndex + 1} de {steps.length}</p>
              <p className="text-sm md:text-base font-bold text-gray-900">{currentStep?.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm md:text-base font-bold text-gray-400 tabular-nums">{currentStepIndex + 1}<span className="text-gray-300 font-medium mx-0.5">/</span>{steps.length}</p>
          </div>
        </div>
        
        {/* Step dots */}
        <div className="flex items-center justify-center gap-0 md:gap-0.5 mt-3 md:mt-4">
          {steps.map((step, index) => {
            const isCurrentStep = step.key === currentStepKey
            const isCompleted = index < currentStepIndex
            return (
              <button
                key={step.key}
                onClick={() => isCompleted && onStepClick(step.key)}
                disabled={!isCompleted}
                className="p-1.5 md:p-2 -mx-0.5 group"
                title={step.title}
              >
                <span className={`block rounded-full transition-all duration-300 ${
                  isCompleted 
                    ? 'w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 group-hover:scale-150 cursor-pointer' 
                    : isCurrentStep 
                    ? 'w-6 md:w-8 h-2 md:h-2.5 bg-blue-600' 
                    : 'w-2 h-2 md:w-2.5 md:h-2.5 bg-gray-200'
                }`} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

