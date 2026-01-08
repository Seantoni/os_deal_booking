'use client'

import { forwardRef, useState, useRef, useImperativeHandle, useTransition, type InputHTMLAttributes, type ReactNode } from 'react'
import EmailIcon from '@mui/icons-material/Email'

const POPULAR_EMAIL_DOMAINS = [
  '@gmail.com',
  '@outlook.com',
  '@yahoo.com',
  '@hotmail.com',
  '@icloud.com',
  '@protonmail.com',
  '@aol.com',
  '@live.com',
  '@msn.com',
  '@yandex.com',
  '@mail.com',
  '@gmx.com'
]

type InputSize = 'sm' | 'md' | 'lg'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  size?: InputSize
  fullWidth?: boolean
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-4 py-2.5',
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const InputComponent = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    size = 'md',
    fullWidth = true,
    className,
    disabled,
    type,
    value,
    onChange,
    onKeyDown,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const isEmailType = type === 'email'
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([])
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(-1)
  const internalRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()

  // Expose the internal ref to the forwarded ref
  useImperativeHandle(ref, () => internalRef.current as HTMLInputElement, [])

  // Email autocomplete logic - optimized with useTransition for INP
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Always update the input value immediately (critical update)
    onChange?.(e)

    if (!isEmailType) {
      return
    }

    const inputValue = e.target.value
    setSelectedEmailIndex(-1)

    // Defer suggestion updates (non-critical) to improve INP
    startTransition(() => {
      // Check if user is typing after @ symbol
      const atIndex = inputValue.lastIndexOf('@')
      if (atIndex !== -1 && atIndex < inputValue.length - 1) {
        const afterAt = inputValue.substring(atIndex + 1)
        
        // Filter domains that match what user is typing
        const filtered = POPULAR_EMAIL_DOMAINS.filter(domain => 
          domain.toLowerCase().startsWith('@' + afterAt.toLowerCase())
        )
        
        if (filtered.length > 0 && afterAt.length > 0) {
          setEmailSuggestions(filtered)
          setShowEmailSuggestions(true)
        } else {
          setShowEmailSuggestions(false)
        }
      } else if (atIndex !== -1 && atIndex === inputValue.length - 1) {
        // User just typed @, show all suggestions
        setEmailSuggestions(POPULAR_EMAIL_DOMAINS)
        setShowEmailSuggestions(true)
      } else {
        setShowEmailSuggestions(false)
      }
    })
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isEmailType && showEmailSuggestions && emailSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedEmailIndex(prev => 
          prev < emailSuggestions.length - 1 ? prev + 1 : prev
        )
        return
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedEmailIndex(prev => prev > 0 ? prev - 1 : -1)
        return
      } else if (e.key === 'Enter' && selectedEmailIndex >= 0) {
        e.preventDefault()
        selectEmailSuggestion()
        return
      } else if (e.key === 'Escape') {
        setShowEmailSuggestions(false)
        setSelectedEmailIndex(-1)
        return
      }
    }

    onKeyDown?.(e)
  }

  const selectEmailSuggestion = () => {
    const currentValue = (value as string) || ''
    const atIndex = currentValue.lastIndexOf('@')
    const beforeAt = atIndex !== -1 ? currentValue.substring(0, atIndex) : currentValue
    const selectedDomain = emailSuggestions[selectedEmailIndex]
    const newEmail = beforeAt + selectedDomain

    // Create synthetic event to trigger onChange
    const syntheticEvent = {
      target: { value: newEmail },
      currentTarget: { value: newEmail },
    } as React.ChangeEvent<HTMLInputElement>

    handleEmailChange(syntheticEvent)
    
    // Focus back on input
    setTimeout(() => {
      internalRef.current?.focus()
      // Move cursor to end
      if (internalRef.current) {
        const length = newEmail.length
        internalRef.current.setSelectionRange(length, length)
      }
    }, 0)

    setShowEmailSuggestions(false)
    setSelectedEmailIndex(-1)
  }

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isEmailType) {
      // Delay hiding suggestions to allow click on suggestion
      setTimeout(() => {
        if (!suggestionsRef.current?.contains(document.activeElement)) {
          setShowEmailSuggestions(false)
        }
      }, 200)
    }

    onBlur?.(e)
  }

  const handleEmailFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(e)

    if (isEmailType) {
      const currentValue = (value as string) || ''
      const atIndex = currentValue.lastIndexOf('@')
      if (atIndex !== -1) {
        const afterAt = currentValue.substring(atIndex + 1)
        if (afterAt.length === 0) {
          // Defer suggestion updates
          startTransition(() => {
            setEmailSuggestions(POPULAR_EMAIL_DOMAINS)
            setShowEmailSuggestions(true)
            setSelectedEmailIndex(-1)
          })
        }
      }
    }
  }

  const renderEmailSuggestions = () => {
    if (!isEmailType || !showEmailSuggestions || emailSuggestions.length === 0) return null

    const currentValue = (value as string) || ''
    const atIndex = currentValue.lastIndexOf('@')
    const beforeAt = atIndex !== -1 ? currentValue.substring(0, atIndex) : currentValue

    return (
      <div
        ref={suggestionsRef}
        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
      >
        {emailSuggestions.map((domain, idx) => {
          const isSelected = idx === selectedEmailIndex
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedEmailIndex(idx)
                selectEmailSuggestion()
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                isSelected
                  ? 'bg-blue-100 text-blue-900 font-medium'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <span className="font-medium">{beforeAt || 'email'}</span>
              <span className="text-blue-600">{domain}</span>
            </button>
          )
        })}
      </div>
    )
  }

  const base =
    'w-full border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 bg-white hover:border-gray-300'

  // Default email icon for email inputs
  const defaultLeftIcon = isEmailType && leftIcon === undefined ? <EmailIcon className="w-4 h-4" /> : leftIcon

  return (
    <label className={cn('flex flex-col gap-0.5', fullWidth && 'w-full')}>
      {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
      <div className="relative">
        {defaultLeftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{defaultLeftIcon}</span>
        )}
        <input
          ref={internalRef}
          type={type}
          disabled={disabled}
          value={value}
          onChange={handleEmailChange}
          onKeyDown={handleEmailKeyDown}
          onBlur={handleEmailBlur}
          onFocus={handleEmailFocus}
          className={cn(
            base,
            sizeClasses[size],
            defaultLeftIcon ? 'pl-9' : '',
            rightIcon ? 'pr-9' : '',
            error ? 'border-red-300 focus:ring-red-500' : '',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{rightIcon}</span>
        )}
        {renderEmailSuggestions()}
      </div>
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-gray-500">{helperText}</span>
      ) : null}
    </label>
  )
})

InputComponent.displayName = 'Input'

export const Input = InputComponent
