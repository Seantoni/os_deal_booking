import React from 'react'
import { PublicPageHeader } from './PublicPageHeader'

interface PublicPageLayoutProps {
  children: React.ReactNode
  title?: string
  maxWidth?: string
}

export function PublicPageLayout({ children, title, maxWidth = 'max-w-[520px]' }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center p-4 font-sans text-[#1d1d1f]">
      {/* Main Card */}
      <div className={`w-full ${maxWidth} bg-white rounded-[18px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden`}>
        {/* Header */}
        <PublicPageHeader />
        
        {/* Content */}
        <div className="p-8 md:p-10">
          {title && (
            <h1 className="text-2xl font-bold text-center mb-6 tracking-tight text-[#1d1d1f]">
              {title}
            </h1>
          )}
          {children}
        </div>

        {/* Footer */}
        <div className="bg-[#f9f9fa] p-5 text-center border-t border-[#e5e5e5]">
          <p className="text-xs text-[#86868b] font-medium">
            © {new Date().getFullYear()} OfertaSimple · Panamá
          </p>
        </div>
      </div>
    </div>
  )
}
