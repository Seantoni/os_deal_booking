interface TruncatedTextWithTooltipProps {
  text?: string | null
  placeholder?: string
  className?: string
  tooltipClassName?: string
}

export default function TruncatedTextWithTooltip({
  text,
  placeholder = '-',
  className = '',
  tooltipClassName = '',
}: TruncatedTextWithTooltipProps) {
  const normalizedText = text?.trim() || ''

  if (!normalizedText) {
    return <span className={`text-sm text-slate-400 ${className}`}>{placeholder}</span>
  }

  return (
    <div className="group relative max-w-full">
      <span className={`block w-full truncate ${className}`}>
        {normalizedText}
      </span>
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute left-0 top-full z-[9999] mt-1 w-max max-w-[32rem] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg group-hover:visible whitespace-pre-wrap break-words ${tooltipClassName}`}
      >
        {normalizedText}
      </div>
    </div>
  )
}
