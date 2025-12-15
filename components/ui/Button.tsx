import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'subtle'
type Size = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

// Minimal class merge helper
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const variantClasses: Record<Variant, string> = {
  // Primary: Rich blue with subtle depth
  primary: [
    'bg-gradient-to-b from-blue-500 to-blue-600 text-white',
    'shadow-[0_1px_2px_rgba(0,0,0,0.05),0_1px_3px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]',
    'hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_2px_6px_rgba(59,130,246,0.25)]',
    'active:from-blue-700 active:to-blue-800',
    'focus-visible:ring-blue-500/40',
    'disabled:from-blue-300 disabled:to-blue-300 disabled:shadow-none disabled:text-blue-100',
  ].join(' '),
  
  // Secondary: Clean white with refined border
  secondary: [
    'bg-white text-gray-700 border border-gray-200/80',
    'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    'hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
    'active:bg-gray-100',
    'focus-visible:ring-gray-400/30',
    'disabled:text-gray-400 disabled:border-gray-200 disabled:bg-gray-50 disabled:shadow-none',
  ].join(' '),
  
  // Outline: Subtle border with transparent bg
  outline: [
    'bg-transparent text-gray-600 border border-gray-300',
    'hover:bg-gray-50 hover:text-gray-800 hover:border-gray-400',
    'active:bg-gray-100',
    'focus-visible:ring-gray-400/30',
    'disabled:text-gray-400 disabled:border-gray-200',
  ].join(' '),
  
  // Ghost: Minimal, no border
  ghost: [
    'bg-transparent text-gray-600',
    'hover:bg-gray-100/80 hover:text-gray-900',
    'active:bg-gray-200/60',
    'focus-visible:ring-gray-400/30',
    'disabled:text-gray-400 disabled:hover:bg-transparent',
  ].join(' '),
  
  // Subtle: Very light background
  subtle: [
    'bg-gray-100/60 text-gray-700',
    'hover:bg-gray-100 hover:text-gray-900',
    'active:bg-gray-200/80',
    'focus-visible:ring-gray-400/30',
    'disabled:text-gray-400 disabled:bg-gray-50',
  ].join(' '),
  
  // Destructive: Red with depth
  destructive: [
    'bg-gradient-to-b from-red-500 to-red-600 text-white',
    'shadow-[0_1px_2px_rgba(0,0,0,0.05),0_1px_3px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]',
    'hover:from-red-600 hover:to-red-700 hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_2px_6px_rgba(239,68,68,0.25)]',
    'active:from-red-700 active:to-red-800',
    'focus-visible:ring-red-500/40',
    'disabled:from-red-300 disabled:to-red-300 disabled:shadow-none disabled:text-red-100',
  ].join(' '),
}

const sizeClasses: Record<Size, string> = {
  xs: 'text-xs px-2.5 py-1 gap-1.5',
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-sm px-5 py-2.5 gap-2',
}

const spinnerSizes: Record<Size, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center font-medium',
        'rounded-lg',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.98] active:transition-none',
        'select-none',
        // Variant & size
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg
          className={cn('animate-spin', spinnerSizes[size])}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-20" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="3" 
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {leftIcon && !loading && (
        <span className="inline-flex items-center shrink-0 [&>svg]:h-4 [&>svg]:w-4">
          {leftIcon}
        </span>
      )}
      {children && <span className={loading ? 'opacity-70' : ''}>{children}</span>}
      {rightIcon && (
        <span className="inline-flex items-center shrink-0 [&>svg]:h-4 [&>svg]:w-4">
          {rightIcon}
        </span>
      )}
    </button>
  )
}

export default Button

