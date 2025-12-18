import { ReactNode } from 'react'

interface TableRowProps {
  children: ReactNode
  index: number
  className?: string
  onClick?: (e?: React.MouseEvent) => void
  highlight?: boolean
}

export function TableRow({ children, index, className = '', onClick, highlight = false }: TableRowProps) {
  // Determine row background color
  // Even rows: white
  // Odd rows: light blue/slate for better contrast
  // Highlighted rows (e.g. pending items): allow custom override via className or specific prop logic
  
  // Base alternating colors
  const baseBgColor = index % 2 === 0 
    ? 'bg-white hover:bg-blue-50/50' 
    : 'bg-slate-100/50 hover:bg-blue-50/50'

  // Combine classes, allowing className to override base colors if needed (like for pending status)
  // If className provides a bg- color, it will typically override baseBgColor if placed after it in the template string
  // provided Tailwind prioritization is correct or if we conditionally apply baseBgColor.
  
  // If highlight is true or className has a bg, we might want to skip the alternating pattern or merge it.
  // For simplicity, let's assume if className includes 'bg-', we use it, otherwise we use alternating.
  
  const hasCustomBg = className.includes('bg-')
  const finalBgColor = hasCustomBg ? '' : baseBgColor
  const cursorClass = onClick ? 'cursor-pointer' : ''

  return (
    <tr
      className={`${finalBgColor} transition-colors group border-b border-gray-100 last:border-0 ${cursorClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

