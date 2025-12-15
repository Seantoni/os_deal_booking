'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'

interface SidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  isCalendarPage: boolean
  isAdmin: boolean
  isEditor: boolean
  role: string | null
  loading: boolean
  // Mobile navigation state
  moreMenuOpen: boolean
  setMoreMenuOpen: (open: boolean) => void
  isMobile: boolean
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isAdmin, isEditor, role, loading } = useUserRole()
  const isCalendarPage = pathname === '/events'
  // Default to closed on Calendar page, open on other pages
  const [isOpen, setIsOpen] = useState(!isCalendarPage)
  const [isCollapsed, setIsCollapsed] = useState(false)
  // Mobile states
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Update open state when pathname changes
  useEffect(() => {
    setIsOpen(!isCalendarPage)
    // Close more menu on navigation
    setMoreMenuOpen(false)
  }, [pathname, isCalendarPage])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isOpen,
    setIsOpen,
    isCollapsed,
    setIsCollapsed,
    isCalendarPage,
    isAdmin: isAdmin || false,
    isEditor: isEditor || false,
    role: role || null,
    loading,
    moreMenuOpen,
    setMoreMenuOpen,
    isMobile,
  }), [isOpen, isCollapsed, isCalendarPage, isAdmin, isEditor, role, loading, moreMenuOpen, isMobile])

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
