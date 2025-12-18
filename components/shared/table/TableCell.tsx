import { ReactNode } from 'react'

interface TableCellProps {
  children?: ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
  align?: 'left' | 'center' | 'right'
}

export function TableCell({ children, className = '', onClick, align = 'left' }: TableCellProps) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
  
  return (
    <td
      className={`px-4 py-[5px] ${alignClass} ${className}`}
      onClick={onClick}
      style={{ height: '32px', verticalAlign: 'middle' }}
    >
      {children}
    </td>
  )
}

