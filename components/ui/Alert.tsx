import { type ReactNode } from 'react'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

type AlertVariant = 'error' | 'warning' | 'info' | 'success'

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  className?: string
  icon?: ReactNode
}

const variantClasses: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-600',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600',
  },
}

const defaultIcons: Record<AlertVariant, ReactNode> = {
  error: <ErrorOutlineIcon fontSize="small" />,
  warning: <WarningIcon fontSize="small" />,
  info: <InfoIcon fontSize="small" />,
  success: <CheckCircleIcon fontSize="small" />,
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function Alert({ variant = 'info', title, children, className, icon }: AlertProps) {
  const variantClass = variantClasses[variant]
  const displayIcon = icon || defaultIcons[variant]

  return (
    <div
      className={cn(
        variantClass.bg,
        variantClass.border,
        variantClass.text,
        'border rounded-lg px-3 py-1.5 flex items-center gap-2',
        className
      )}
    >
      <span className={cn(variantClass.icon, 'flex-shrink-0')}>{displayIcon}</span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {title && <span className="font-semibold text-xs">{title}</span>}
        <span className="text-xs">{children}</span>
      </div>
    </div>
  )
}

export default Alert

