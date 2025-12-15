'use client'

import { ReactNode } from 'react'
import { SidebarProvider } from '@/components/common/SidebarContext'
import { SharedDataProvider } from '@/hooks/useSharedData'
import HamburgerMenu from '@/components/common/HamburgerMenu'
import MobileBottomNav from '@/components/common/MobileBottomNav'

/**
 * Shared layout for all authenticated pages
 * The sidebar and bottom nav are rendered once here and persist across navigation
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <SharedDataProvider>
        <div className="h-screen flex flex-col bg-white">
          <HamburgerMenu />
          {children}
          <MobileBottomNav />
        </div>
      </SharedDataProvider>
    </SidebarProvider>
  )
}
