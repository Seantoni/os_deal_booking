'use client'

import { ReactNode } from 'react'
import { useSidebar } from './AppClientProviders'

interface PageContentProps {
  children: ReactNode
}

export default function PageContent({ children }: PageContentProps) {
  const { isOpen, isCalendarPage } = useSidebar()
  
  // Calculate left margin based on sidebar state
  // Sidebar is 66px wide + 6px margin from left + 6px gap (same as left) = 78px
  // On mobile (below md): no margin
  // On Calendar page: don't push content (overlay behavior)
  // On other pages (desktop): push content when sidebar is open
  let desktopMargin = ''
  if (!isCalendarPage && isOpen) {
    desktopMargin = 'md:ml-[70px]'
  }
  
  return (
    <div className={`h-full overflow-auto transition-all duration-300 ml-0 ${desktopMargin}`}>
      {children}
    </div>
  )
}
