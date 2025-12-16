'use client'

import { ReactNode } from 'react'

interface CellStackProps {
  primary: ReactNode
  secondary?: ReactNode
  tertiary?: ReactNode
  align?: 'left' | 'right' | 'center'
}

export default function CellStack({ primary, secondary, tertiary, align = 'left' }: CellStackProps) {
  const alignClass = align === 'center' ? 'items-center' : align === 'right' ? 'items-end' : 'items-start'
  const textAlign = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

  return (
    <div className={`flex flex-col ${alignClass}`}>
      <div className={`text-[13px] text-gray-900 ${textAlign} leading-tight break-all`}>{primary}</div>
      {secondary && <div className={`text-[11px] text-gray-500 ${textAlign} leading-tight mt-0.5 break-all`}>{secondary}</div>}
      {tertiary && <div className={`text-[11px] text-gray-500 ${textAlign} leading-tight mt-0.5 break-all`}>{tertiary}</div>}
    </div>
  )
}
