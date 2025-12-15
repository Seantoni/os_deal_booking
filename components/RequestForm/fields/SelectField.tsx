import type { FieldConfig } from '../config/field-types'
import { Select } from '@/components/ui'

interface SelectFieldProps {
  config: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function SelectField({ config, value, onChange, error, disabled }: SelectFieldProps) {
  // Build label with required indicator
  const labelText = config.required ? `${config.label} *` : config.label

  // Convert options format
  const options = config.options || []

  return (
    <div className={config.fullWidth ? 'md:col-span-2' : ''}>
      <Select
        label={labelText}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        options={options}
        placeholder="Seleccione..."
        error={error}
        helperText={config.helpText}
        size="md"
      />
    </div>
  )
}
