'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from './AppClientProviders'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ListAltIcon from '@mui/icons-material/ListAlt'
import DescriptionIcon from '@mui/icons-material/Description'
import SettingsIcon from '@mui/icons-material/Settings'
import BusinessIcon from '@mui/icons-material/Business'
import HandshakeIcon from '@mui/icons-material/Handshake'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import HistoryIcon from '@mui/icons-material/History'
import CampaignIcon from '@mui/icons-material/Campaign'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

// Sidebar item type
type SidebarItem = {
  name: string
  href: string
  Icon: React.ComponentType<{ fontSize?: string; className?: string }>
}

// Define sidebar configurations for each role
// Organized by workflow: Daily Ops -> Sales Funnel -> Fulfillment -> Database
const adminSidebarConfig = {
  mainItems: [
    // 1. Daily Overview & Actions
    { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
    { name: 'Tareas', href: '/tasks', Icon: CheckCircleIcon },
    { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
    { name: 'Solicitudes', href: '/booking-requests', Icon: DescriptionIcon },
    
    // 2. Sales Funnel (Inflow -> Active -> Closing)
    { name: 'Leads', href: '/leads', Icon: PersonAddIcon },
    { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
    { name: 'Marketing', href: '/marketing', Icon: CampaignIcon },
    { name: 'Oportunidades', href: '/opportunities', Icon: HandshakeIcon },
        
    // 4. Database / CRM
    { name: 'Negocios', href: '/businesses', Icon: BusinessIcon },
    
    // 5. Market Intelligence (Admin only)
    { name: 'Inteligencia', href: '/market-intelligence', Icon: TrendingUpIcon },
  ],
  bottomItems: [
    { name: 'Calendario', href: '/events', Icon: CalendarMonthIcon },
    { name: 'Actividad', href: '/activity-log', Icon: HistoryIcon },
    { name: 'Configuración', href: '/settings', Icon: SettingsIcon },
  ],
}

const salesSidebarConfig = {
  mainItems: [
    // 1. Daily Overview & Actions
    { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
    { name: 'Tareas', href: '/tasks', Icon: CheckCircleIcon },
    { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
    { name: 'Solicitudes', href: '/booking-requests', Icon: DescriptionIcon },
    
    // 2. Sales Funnel
    // Note: Leads might be restricted for sales, but if they have access:
    // { name: 'Leads', href: '/leads', Icon: PersonAddIcon }, 
    { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
    { name: 'Oportunidades', href: '/opportunities', Icon: HandshakeIcon },
    
    // 4. Database
    { name: 'Negocios', href: '/businesses', Icon: BusinessIcon },
  ],
  bottomItems: [
    { name: 'Calendario', href: '/events', Icon: CalendarMonthIcon },
  ],
}

const editorSidebarConfig = {
  mainItems: [
    { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
  ],
  bottomItems: [], // No settings for editor
}

const marketingSidebarConfig = {
  mainItems: [
    { name: 'Marketing', href: '/marketing', Icon: CampaignIcon },
  ],
  bottomItems: [], // No additional items for marketing role
}

export default function HamburgerMenu() {
  const pathname = usePathname()
  const { isOpen, setIsOpen, isCalendarPage, role, loading } = useSidebar()
  
  // Track mount state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get sidebar configuration based on role
  const sidebarConfig = useMemo(() => {
    // Return empty config while loading or if role is not set
    if (loading || !role || role === null) {
      return {
        mainItems: [],
        bottomItems: [],
      }
    }
    
    // Normalize role to lowercase for comparison
    const normalizedRole = role.toLowerCase().trim()
    
    // Strict role matching - only return config if role matches exactly
    switch (normalizedRole) {
      case 'admin':
        return adminSidebarConfig
      case 'editor':
        return editorSidebarConfig
      case 'sales':
        return salesSidebarConfig
      case 'marketing':
        return marketingSidebarConfig
      default:
        // If role doesn't match any known role, return empty config
        return {
          mainItems: [],
          bottomItems: [],
        }
    }
  }, [role, loading])

  return (
    <>
      {/* Backdrop - only show on Calendar page when sidebar is open (desktop only) */}
      {isOpen && isCalendarPage && (
        <div 
          className="hidden md:block fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar Menu - Hidden on mobile (md:block) */}
      <div className={`hidden md:block absolute top-2 left-2 bottom-2 bg-slate-50/95 backdrop-blur-xl border border-slate-200/80 shadow-lg rounded-2xl transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)]'
      } w-[88px]`} style={{ zIndex: isCalendarPage ? 50 : 30 }}>
        <div className={`h-full flex flex-col`}>
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-1.5 scrollbar-hide">
            {(!mounted || loading) ? (
              // Shimmer loading effect
              <div className="space-y-4 px-1">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 px-1 py-2 rounded-lg animate-pulse"
                  >
                    <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                    <div className="h-1.5 bg-slate-200 rounded w-10"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Main Items */}
                {sidebarConfig.mainItems.length > 0 && (
                  <div className="space-y-2">
                    {sidebarConfig.mainItems.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                      const Icon = item.Icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            if (isCalendarPage) {
                              setIsOpen(false)
                            }
                          }}
                          className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl transition-all duration-300 group relative ${
                            isActive 
                              ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 translate-y-[-1px]' 
                              : 'text-slate-500 hover:bg-white/80 hover:shadow-sm'
                          }`}
                          title={item.name}
                          style={{
                            color: isActive ? '#e84c0f' : undefined,
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.color = '#e84c0f'
                              const icon = e.currentTarget.querySelector('svg')
                              if (icon) icon.style.color = '#e84c0f'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.color = ''
                              const icon = e.currentTarget.querySelector('svg')
                              if (icon) icon.style.color = ''
                            }
                          }}
                        >
                          <Icon className={`transition-colors duration-300 ${isActive ? '' : 'text-slate-400'}`} style={{ fontSize: '1.35rem', color: isActive ? '#e84c0f' : undefined }} />
                          <span className="text-[9px] font-semibold leading-none text-center w-full truncate px-0.5 opacity-90 tracking-tight">
                            {item.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </nav>

          {/* Bottom Section - Settings (User profile is now in GlobalHeader) */}
          {mounted && !loading && sidebarConfig.bottomItems.length > 0 && (
            <div className="px-1.5 pb-3">
              <div className="space-y-2">
                <div className="h-px w-8 mx-auto bg-slate-200/60 mb-2" />
                {sidebarConfig.bottomItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  const Icon = item.Icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (isCalendarPage) {
                          setIsOpen(false)
                        }
                      }}
                      className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl transition-all duration-300 group relative ${
                        isActive 
                          ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 translate-y-[-1px]' 
                          : 'text-slate-500 hover:bg-white/80 hover:shadow-sm'
                      }`}
                      title={item.name}
                      style={{
                        color: isActive ? '#e84c0f' : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#e84c0f'
                          const icon = e.currentTarget.querySelector('svg')
                          if (icon) icon.style.color = '#e84c0f'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = ''
                          const icon = e.currentTarget.querySelector('svg')
                          if (icon) icon.style.color = ''
                        }
                      }}
                    >
                      <Icon className={`transition-colors duration-300 ${isActive ? '' : 'text-slate-400'}`} style={{ fontSize: '1.35rem', color: isActive ? '#e84c0f' : undefined }} />
                      <span className="text-[9px] font-semibold leading-none text-center w-full truncate px-0.5 opacity-90 tracking-tight">
                        {item.name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
