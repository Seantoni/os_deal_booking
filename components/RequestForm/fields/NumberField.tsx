import type { FieldConfig } from '../config/field-types'
import { Input } from '@/components/ui'

interface NumberFieldProps {
  config: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function NumberField({ config, value, onChange, error, disabled }: NumberFieldProps) {
  // Build label with required indicator
  const labelText = config.required ? `${config.label} *` : config.label

  return (
    <div className={config.fullWidth ? 'md:col-span-2' : ''}>
      <Input
        type="number"
        label={labelText}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={config.placeholder}
        min={config.min}
        max={config.max}
        error={error}
        helperText={config.helpText}
        size="md"
      />
    </div>
  )
}
