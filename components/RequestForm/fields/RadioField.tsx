import type { FieldConfig } from '../config/field-types'

interface RadioFieldProps {
  config: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function RadioField({ config, value, onChange, error, disabled }: RadioFieldProps) {
  return (
    <div className={`group ${config.fullWidth ? 'md:col-span-2' : ''}`}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-4">
        {config.options?.map((option) => (
          <label 
            key={option.value} 
            className={`flex items-center gap-2 cursor-pointer ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={config.name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
      {config.helpText && !error && (
        <p className="mt-1 text-xs text-gray-500">{config.helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
