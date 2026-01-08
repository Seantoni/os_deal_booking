'use client'

import { ReactNode } from 'react'
import { useSidebar } from './AppClientProviders'

interface PageContentProps {
  children: ReactNode
}

export default function PageContent({ children }: PageContentProps) {
  const { isOpen, isCalendarPage } = useSidebar()
  
  // Calculate left margin based on sidebar state
  // Sidebar is 78px wide + 8px margin from left + gap = ~86px
  // On mobile (below md): no margin
  // On Calendar page: don't push content (overlay behavior)
  // On other pages (desktop): push content when sidebar is open
  let desktopMargin = ''
  if (!isCalendarPage && isOpen) {
    desktopMargin = 'md:ml-[86px]'
  }
  
  return (
    <div className={`h-full overflow-auto transition-all duration-300 ml-0 ${desktopMargin}`}>
      {children}
    </div>
  )
}
