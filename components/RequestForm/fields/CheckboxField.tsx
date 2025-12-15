import type { FieldConfig } from '../config/field-types'

interface CheckboxFieldProps {
  config: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function CheckboxField({ config, value, onChange, error, disabled }: CheckboxFieldProps) {
  const isChecked = value === 'true' || value === 'Sí'

  const handleChange = (checked: boolean) => {
    onChange(checked ? 'Sí' : 'No')
  }

  return (
    <div className={`group ${config.fullWidth ? 'md:col-span-2' : ''}`}>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => handleChange(e.target.checked)}
          disabled={disabled}
          className={`w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          `}
        />
        <span className="text-sm font-semibold text-gray-700">
          {config.label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>
      {config.helpText && !error && (
        <p className="mt-1 text-xs text-gray-500 ml-8">{config.helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500 ml-8">{error}</p>
      )}
    </div>
  )
}
