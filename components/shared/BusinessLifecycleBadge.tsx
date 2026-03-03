'use client'

export type BusinessLifecycle = 'NEW' | 'RECURRENT' | 'UNKNOWN' | null | undefined

interface LifecycleDisplay {
  label: 'N' | 'R' | '-'
  title: string
  className: string
}

export function getBusinessLifecycleDisplay(lifecycle: BusinessLifecycle): LifecycleDisplay {
  if (lifecycle === 'NEW') {
    return {
      label: 'N',
      title: 'Negocio Nuevo',
      className: 'bg-emerald-100 text-emerald-700',
    }
  }

  if (lifecycle === 'RECURRENT') {
    return {
      label: 'R',
      title: 'Negocio Recurrente',
      className: 'bg-blue-100 text-blue-700',
    }
  }

  return {
    label: '-',
    title: 'Sin clasificar',
    className: 'bg-gray-100 text-gray-500',
  }
}

interface BusinessLifecycleBadgeProps {
  lifecycle: BusinessLifecycle
  className?: string
}

export default function BusinessLifecycleBadge({
  lifecycle,
  className = '',
}: BusinessLifecycleBadgeProps) {
  const display = getBusinessLifecycleDisplay(lifecycle)

  return (
    <span
      className={`inline-flex min-w-[18px] justify-center rounded px-1 py-0.5 text-[10px] font-semibold ${display.className} ${className}`}
      title={display.title}
    >
      {display.label}
    </span>
  )
}
