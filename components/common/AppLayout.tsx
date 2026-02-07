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
        Edge-to-edge on mobile, padded card on desktop
      */}
      <div className="p-0 md:p-3 h-full">
        <div className="bg-white md:rounded-2xl md:border md:border-slate-200/80 md:shadow-sm h-full flex flex-col overflow-hidden">
          {/* Page header with title and actions — hidden on mobile to save space */}
          <div className="hidden md:block border-b border-gray-200 px-5 py-3 flex-shrink-0 bg-white">
            <PageHeader title={title} subtitle={subtitle} actions={actions} />
          </div>
          
          {/* Page content - scrollable */}
          {/* Add bottom padding on mobile to account for floating bottom nav pill */}
          <div className="flex-1 overflow-auto pb-20 md:pb-0 bg-gray-50/30">
            {children}
          </div>
        </div>
      </div>
    </PageContent>
  )
}
