import type { FieldConfig } from '../config/field-types'
import { Textarea } from '@/components/ui'

interface TextareaFieldProps {
  config: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function TextareaField({ config, value, onChange, error, disabled }: TextareaFieldProps) {
  // Build label with required indicator
  const labelText = config.required ? `${config.label} *` : config.label

  return (
    <div className={config.fullWidth ? 'md:col-span-2' : ''}>
      <Textarea
        label={labelText}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={config.rows || 3}
        placeholder={config.placeholder}
        error={error}
        helperText={config.helpText}
        size="md"
      />
    </div>
  )
}
