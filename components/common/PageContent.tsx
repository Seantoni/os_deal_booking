'use client'

import { ReactNode } from 'react'
import { useSidebar } from './AppClientProviders'

interface PageContentProps {
  children: ReactNode
}

export default function PageContent({ children }: PageContentProps) {
  const { isOpen, isCalendarPage } = useSidebar()
  
  // Use CSS breakpoints for mobile vs desktop
  // On mobile (below md): no margin
  // On Calendar page: don't push content (overlay behavior)
  // On other pages (desktop): push content when sidebar is open
  let desktopMargin = ''
  if (!isCalendarPage && isOpen) {
    // 88px sidebar + 12px left margin + 20px gap = ~120px
    desktopMargin = 'md:ml-[120px]'
  }
  
  return (
    <div className={`flex-1 transition-all duration-300 ml-0 ${desktopMargin}`}>
      {children}
    </div>
  )
}
