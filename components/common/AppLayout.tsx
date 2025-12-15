'use client'

import { ReactNode } from 'react'
import AppHeader from './AppHeader'
import PageContent from './PageContent'

interface AppLayoutProps {
  children: ReactNode
  title: string
  actions?: ReactNode
}

/**
 * Page content wrapper for authenticated pages
 * Sidebar and bottom nav are provided by the (app) layout
 */
export default function AppLayout({ children, title, actions }: AppLayoutProps) {
  return (
    <PageContent>
      {/* 
        Container padding (p-3) matches sidebar position (top-3, left-3 + width)
        h-[calc(100vh-1.5rem)] matches sidebar height (100vh - 1.5rem/24px)
        Margin top (mt-3) ensures it starts at same vertical position as sidebar
      */}
      <div className="pr-3 pb-3 pt-3 h-screen">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm h-full flex flex-col overflow-hidden relative">
          <AppHeader title={title} actions={actions} />
          {/* Add bottom padding on mobile to account for bottom nav */}
          <div className="flex-1 overflow-auto pb-16 md:pb-0 bg-gray-50/30">
            {children}
          </div>
        </div>
      </div>
    </PageContent>
  )
}
