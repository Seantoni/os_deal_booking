'use client'

import { ReactNode } from 'react'
import PageContent from './PageContent'
import PageHeader from './PageHeader'

interface AppLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
}

/**
 * Page content wrapper for authenticated pages
 * GlobalHeader and sidebar are provided by the (app) layout
 */
export default function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  return (
    <PageContent>
      {/* 
        Container with padding to account for sidebar
        Full height minus global header (h-14 = 56px)
      */}
      <div className="p-3 h-full">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm h-full flex flex-col overflow-hidden">
          {/* Page header with title and actions */}
          <div className="border-b border-gray-100 px-5 py-3 flex-shrink-0 bg-white">
            <PageHeader title={title} subtitle={subtitle} actions={actions} />
          </div>
          
          {/* Page content - scrollable */}
          {/* Add bottom padding on mobile to account for bottom nav */}
          <div className="flex-1 overflow-auto pb-16 md:pb-0 bg-gray-50/30">
            {children}
          </div>
        </div>
      </div>
    </PageContent>
  )
}
