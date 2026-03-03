'use client'

import TruncatedTextWithTooltip from './TruncatedTextWithTooltip'

interface TaskDescriptionCellProps {
  text?: string | null
  mode?: 'truncate' | 'multiline'
  maxLines?: number
  className?: string
}

export default function TaskDescriptionCell({
  text,
  mode = 'truncate',
  maxLines = 5,
  className = '',
}: TaskDescriptionCellProps) {
  const normalizedText = text?.trim() || ''
  const fallbackText = normalizedText || '-'

  if (mode === 'multiline') {
    return (
      <div className="group relative max-w-full">
        <p
          className={`text-sm text-slate-700 whitespace-pre-line break-words leading-relaxed py-1 ${className}`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: Math.max(1, Math.floor(maxLines)),
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {fallbackText}
        </p>
        {normalizedText && (
          <div
            role="tooltip"
            className="pointer-events-none invisible absolute left-0 top-full z-50 mt-1 w-max max-w-[32rem] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg group-hover:visible whitespace-pre-wrap break-words"
          >
            {normalizedText}
          </div>
        )}
      </div>
    )
  }

  return (
    <TruncatedTextWithTooltip
      text={normalizedText || null}
      placeholder="-"
      className={`text-sm text-slate-700 ${className}`}
    />
  )
}
