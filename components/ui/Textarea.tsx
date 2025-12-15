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
    'w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors resize-none'

  return (
    <label className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
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

