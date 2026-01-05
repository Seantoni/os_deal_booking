'use client'

import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

/**
 * PageHeader - Header section within page content
 * Used for page titles and action buttons
 */
export default function PageHeader({ 
  title, 
  subtitle,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 truncate tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

