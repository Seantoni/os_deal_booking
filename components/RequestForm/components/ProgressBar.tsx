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
    <div className="bg-white rounded-xl md:rounded-2xl shadow-md md:shadow-lg border border-gray-100 relative overflow-hidden">
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 w-full h-1 md:h-1.5 bg-gray-100">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Unified simplified view for both mobile and desktop */}
      <div className="p-4 md:p-5 pt-5 md:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg">
              {currentStep && <currentStep.icon className="text-xl md:text-2xl" />}
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Paso {currentStepIndex + 1} de {steps.length}</p>
              <p className="text-sm md:text-base font-bold text-gray-900">{currentStep?.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl md:text-3xl font-bold text-blue-600">{Math.round(progress)}%</p>
          </div>
        </div>
        
        {/* Step dots - larger on desktop */}
        <div className="flex items-center justify-center gap-1.5 md:gap-2 mt-3 md:mt-4">
          {steps.map((step, index) => {
            const isCurrentStep = step.key === currentStepKey
            const isCompleted = index < currentStepIndex
            return (
              <button
                key={step.key}
                onClick={() => isCompleted && onStepClick(step.key)}
                disabled={!isCompleted}
                className={`rounded-full transition-all duration-300 ${
                  isCompleted 
                    ? 'w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 hover:scale-125 cursor-pointer' 
                    : isCurrentStep 
                    ? 'w-6 md:w-8 h-2 md:h-2.5 bg-blue-600' 
                    : 'w-2 h-2 md:w-2.5 md:h-2.5 bg-gray-300'
                }`}
                title={step.title}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

