'use client'

import { ReactNode } from 'react'
import { useSidebar } from './AppClientProviders'

interface PageContentProps {
  children: ReactNode
}

export default function PageContent({ children }: PageContentProps) {
  const { isOpen, isCalendarPage } = useSidebar()
  
  // Calculate left margin based on sidebar state
  // Sidebar is 88px wide + 8px margin from left + gap = ~95px
  // On mobile (below md): no margin
  // On Calendar page: don't push content (overlay behavior)
  // On other pages (desktop): push content when sidebar is open
  let desktopMargin = ''
  if (!isCalendarPage && isOpen) {
    desktopMargin = 'md:ml-[95px]'
  }
  
  return (
    <div className={`h-full overflow-auto transition-all duration-300 ml-0 ${desktopMargin}`}>
      {children}
    </div>
  )
}
