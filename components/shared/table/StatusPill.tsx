'use client'

type Tone = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const toneClasses: Record<Tone, string> = {
  default: 'bg-gray-100 text-gray-600 ring-1 ring-gray-500/10',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-700/10',
  success: 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
  neutral: 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/10',
}

interface StatusPillProps {
  label: string
  tone?: Tone
}

export default function StatusPill({ label, tone = 'default' }: StatusPillProps) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${toneClasses[tone]}`}>
      {label}
    </span>
  )
}
