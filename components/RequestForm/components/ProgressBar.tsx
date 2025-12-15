import VerifiedIcon from '@mui/icons-material/Verified'
import type { StepConfig } from '../constants'

interface ProgressBarProps {
  steps: StepConfig[]
  currentStepKey: string
  onStepClick: (stepKey: string) => void
}

export default function ProgressBar({ steps, currentStepKey, onStepClick }: ProgressBarProps) {
  const currentStepIndex = steps.findIndex(step => step.key === currentStepKey)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between relative z-10 pt-2">
        {steps.map((step, index) => {
          const isCurrentStep = step.key === currentStepKey
          const isCompleted = index < currentStepIndex
          
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative group">
              <button
                onClick={() => isCompleted && onStepClick(step.key)}
                disabled={!isCompleted && !isCurrentStep}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                  isCompleted
                    ? 'bg-green-500 text-white shadow-green-200 hover:bg-green-600'
                    : isCurrentStep
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white ring-4 ring-blue-50 shadow-blue-200 scale-110'
                    : 'bg-white border-2 border-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <VerifiedIcon fontSize="small" />
                ) : (
                  <step.icon fontSize="small" className={isCurrentStep ? 'animate-pulse' : ''} />
                )}
              </button>
              <span className={`text-[10px] sm:text-xs mt-3 font-medium text-center transition-colors duration-300 absolute -bottom-8 w-24 ${
                isCurrentStep ? 'text-blue-700' : 
                isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.title}
              </span>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden sm:block absolute top-6 left-1/2 w-full h-[2px] -z-10 bg-gray-100">
                  <div 
                    className={`h-full bg-green-500 transition-all duration-500 ${
                      isCompleted ? 'w-full' : 'w-0'
                    }`} 
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* Spacer for text labels */}
      <div className="h-6"></div> 
    </div>
  )
}

