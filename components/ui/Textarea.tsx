import { forwardRef, type TextareaHTMLAttributes, type ReactNode } from 'react'

type TextareaSize = 'sm' | 'md' | 'lg'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  size?: TextareaSize
  fullWidth?: boolean
}

const sizeClasses: Record<TextareaSize, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-4 py-2.5',
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    error,
    helperText,
    size = 'md',
    fullWidth = true,
    className,
    disabled,
    ...props
  },
  ref
) {
  const base =
    'w-full border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 bg-white hover:border-gray-300 resize-none'

  // Check if required (from props spread)
  const isRequired = props.required

  return (
    <label className={cn('flex flex-col gap-0.5', fullWidth && 'w-full')}>
      {label && (
        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
          {label}
          {isRequired && <span className="text-red-500">*</span>}
        </span>
      )}
      <textarea
        ref={ref}
        disabled={disabled}
        className={cn(
          base,
          sizeClasses[size],
          error && 'border-red-300 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-gray-500">{helperText}</span>
      ) : null}
    </label>
  )
})

export default Textarea

