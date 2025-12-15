import type { FieldConfig } from '../config/field-types'
import { Input } from '@/components/ui'

interface TextFieldProps {
  config: FieldConfig
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function TextField({ config, value, onChange, error, disabled }: TextFieldProps) {
  const inputType = config.type === 'email' ? 'email' 
    : config.type === 'phone' ? 'tel'
    : config.type === 'currency' ? 'text'
    : 'text'

  // Build label with required indicator
  const labelText = config.required ? `${config.label} *` : config.label

  return (
    <div className={config.fullWidth ? 'md:col-span-2' : ''}>
      <Input
        type={inputType}
        label={labelText}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={config.placeholder}
        error={error}
        helperText={config.helpText}
        size="md"
      />
    </div>
  )
}
