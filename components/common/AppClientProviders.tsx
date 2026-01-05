'use client'

import { ReactNode, createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import type { UserRole, UserData } from '@/types'
import type { Category } from '@prisma/client'

// ============================================================================
// Shared Data Context (Categories & Users)
// ============================================================================

interface SharedDataContextType {
  categories: Category[]
  users: UserData[]
  loading: boolean
  refreshCategories: () => Promise<void>
  refreshUsers: () => Promise<void>
}

const SharedDataContext = createContext<SharedDataContextType | null>(null)

export function useSharedData() {
  const context = useContext(SharedDataContext)
  if (!context) {
    return {
      categories: [] as Category[],
      users: [] as UserData[],
      loading: false,
      refreshCategories: async () => {},
      refreshUsers: async () => {},
    }
  }
  return context
}

// Utility to clear cache (e.g., after settings change)
let cachedCategories: Category[] | null = null
let cachedUsers: UserData[] | null = null

export function clearSharedDataCache() {
  cachedCategories = null
  cachedUsers = null
}

// ============================================================================
// Sidebar Context
// ============================================================================

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
  moreMenuOpen: boolean
  setMoreMenuOpen: (open: boolean) => void
  isMobile: boolean
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within AppClientProviders')
  }
  return context
}

// ============================================================================
// Combined App Client Providers
// ============================================================================

interface AppClientProvidersProps {
  children: ReactNode
  // Server-fetched initial data
  initialCategories?: Category[]
  initialUsers?: UserData[]
  initialRole?: UserRole | null
}

export default function AppClientProviders({ 
  children,
  initialCategories = [],
  initialUsers = [],
  initialRole = null,
}: AppClientProvidersProps) {
  const pathname = usePathname()
  const { user, isLoaded: userLoaded } = useUser()
  const userId = user?.id || null
  
  // ============================================================================
  // Role State (initialized from server)
  // ============================================================================
  const [role, setRole] = useState<UserRole | null>(initialRole)
  const [roleLoading, setRoleLoading] = useState(!initialRole)
  
  // Fetch role from server if not provided (fallback)
  useEffect(() => {
    if (initialRole || !userLoaded || !userId) return
    
    // Only fetch if we don't have initial role
    fetch('/api/user/role', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.role) {
          setRole(data.role)
        }
      })
      .finally(() => setRoleLoading(false))
  }, [initialRole, userLoaded, userId])
  
  const isAdmin = role === 'admin'
  const isEditor = role === 'editor' || role === 'ere'
  
  // ============================================================================
  // Shared Data State (initialized from server)
  // ============================================================================
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [users, setUsers] = useState<UserData[]>(initialUsers)
  const [sharedDataLoading, setSharedDataLoading] = useState(false)
  
  // Cache the initial data
  useEffect(() => {
    if (initialCategories.length > 0) cachedCategories = initialCategories
    if (initialUsers.length > 0) cachedUsers = initialUsers
  }, [initialCategories, initialUsers])
  
  const refreshCategories = useCallback(async () => {
    setSharedDataLoading(true)
    try {
      const { getCategories } = await import('@/app/actions/categories')
      const result = await getCategories()
      if (result.success && result.data) {
        cachedCategories = result.data
        setCategories(result.data)
      }
    } finally {
      setSharedDataLoading(false)
    }
  }, [])
  
  const refreshUsers = useCallback(async () => {
    if (!isAdmin) return // Only admin can refresh users
    setSharedDataLoading(true)
    try {
      const { getAllUsers } = await import('@/app/actions/crm')
      const result = await getAllUsers()
      if (result.success && result.data) {
        cachedUsers = result.data
        setUsers(result.data)
      }
    } finally {
      setSharedDataLoading(false)
    }
  }, [isAdmin])
  
  const sharedDataValue = useMemo(() => ({
    categories,
    users,
    loading: sharedDataLoading,
    refreshCategories,
    refreshUsers,
  }), [categories, users, sharedDataLoading, refreshCategories, refreshUsers])
  
  // ============================================================================
  // Sidebar State
  // ============================================================================
  const isCalendarPage = pathname === '/events'
  const [isOpen, setIsOpen] = useState(!isCalendarPage)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Update sidebar state on navigation
  useEffect(() => {
    setIsOpen(!isCalendarPage)
    setMoreMenuOpen(false)
  }, [pathname, isCalendarPage])
  
  const sidebarValue = useMemo(() => ({
    isOpen,
    setIsOpen,
    isCollapsed,
    setIsCollapsed,
    isCalendarPage,
    isAdmin,
    isEditor,
    role,
    loading: roleLoading,
    moreMenuOpen,
    setMoreMenuOpen,
    isMobile,
  }), [isOpen, isCollapsed, isCalendarPage, isAdmin, isEditor, role, roleLoading, moreMenuOpen, isMobile])

  return (
    <SharedDataContext.Provider value={sharedDataValue}>
      <SidebarContext.Provider value={sidebarValue}>
        {children}
      </SidebarContext.Provider>
    </SharedDataContext.Provider>
  )
}

