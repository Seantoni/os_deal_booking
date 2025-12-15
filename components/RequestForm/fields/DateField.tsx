import type { FieldConfig } from '../config/field-types'
import { Input } from '@/components/ui'

interface DateFieldProps {
  config: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function DateField({ config, value, onChange, error, disabled }: DateFieldProps) {
  // Build label with required indicator
  const labelText = config.required ? `${config.label} *` : config.label

  return (
    <div className={config.fullWidth ? 'md:col-span-2' : ''}>
      <Input
        type="date"
        label={labelText}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        error={error}
        helperText={config.helpText}
        size="md"
      />
    </div>
  )
}
