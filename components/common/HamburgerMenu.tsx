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
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import HistoryIcon from '@mui/icons-material/History'
import CampaignIcon from '@mui/icons-material/Campaign'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AnalyticsIcon from '@mui/icons-material/Analytics'

// Sidebar item type
type SidebarItem = {
  name: string
  href: string
  Icon: React.ComponentType<{ fontSize?: string; className?: string }>
}

// Define sidebar configurations for each role
// Organized into 3 groups: Monitor -> Work -> Acquire
const adminSidebarConfig = {
  // Monitor & Analyze (top - high-level overview)
  monitorItems: [
    { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
    { name: 'Métricas', href: '/deal-metrics', Icon: AnalyticsIcon },
    { name: 'Inteligencia', href: '/market-intelligence', Icon: TrendingUpIcon },
  ],
  // Work (daily execution - heart of the product)
  workItems: [
    { name: 'Tareas', href: '/tasks', Icon: CheckCircleIcon },
    { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
    { name: 'Solicitudes', href: '/booking-requests', Icon: DescriptionIcon },
    { name: 'Negocios', href: '/businesses', Icon: BusinessIcon },
    { name: 'Opps', href: '/opportunities', Icon: HandshakeIcon },
  ],
  // Acquire & Grow (less frequent)
  acquireItems: [
    { name: 'Leads', href: '/leads', Icon: PersonAddIcon },
    { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
    { name: 'Marketing', href: '/marketing', Icon: CampaignIcon },
  ],
  // Admin-only management
  adminItems: [
    { name: 'Asignaciones', href: '/assignments', Icon: AssignmentReturnIcon },
  ],
  bottomItems: [
    { name: 'Calendario', href: '/events', Icon: CalendarMonthIcon },
    { name: 'Actividad', href: '/activity-log', Icon: HistoryIcon },
    { name: 'Configuración', href: '/settings', Icon: SettingsIcon },
  ],
}

const salesSidebarConfig = {
  monitorItems: [
    { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
  ],
  workItems: [
    { name: 'Tareas', href: '/tasks', Icon: CheckCircleIcon },
    { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
    { name: 'Solicitudes', href: '/booking-requests', Icon: DescriptionIcon },
    { name: 'Negocios', href: '/businesses', Icon: BusinessIcon },
    { name: 'Opps', href: '/opportunities', Icon: HandshakeIcon },
  ],
  acquireItems: [
    { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
  ],
  adminItems: [] as SidebarItem[],
  bottomItems: [
    { name: 'Calendario', href: '/events', Icon: CalendarMonthIcon },
  ],
}

const editorSidebarConfig = {
  monitorItems: [] as SidebarItem[],
  workItems: [] as SidebarItem[],
  acquireItems: [
    { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
  ],
  adminItems: [] as SidebarItem[],
  bottomItems: [] as SidebarItem[],
}

const marketingSidebarConfig = {
  monitorItems: [] as SidebarItem[],
  workItems: [] as SidebarItem[],
  acquireItems: [
    { name: 'Marketing', href: '/marketing', Icon: CampaignIcon },
  ],
  adminItems: [] as SidebarItem[],
  bottomItems: [] as SidebarItem[],
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
        monitorItems: [] as SidebarItem[],
        workItems: [] as SidebarItem[],
        acquireItems: [] as SidebarItem[],
        adminItems: [] as SidebarItem[],
        bottomItems: [] as SidebarItem[],
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
          monitorItems: [] as SidebarItem[],
          workItems: [] as SidebarItem[],
          acquireItems: [] as SidebarItem[],
          adminItems: [] as SidebarItem[],
          bottomItems: [] as SidebarItem[],
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
      <div className={`hidden md:block absolute top-3 left-2 bottom-3 bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-md rounded-xl transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)]'
      } w-[78px]`} style={{ zIndex: isCalendarPage ? 50 : 30 }}>
        <div className={`h-full flex flex-col`}>
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-1.5 scrollbar-hide">
            {(!mounted || loading) ? (
              // Shimmer loading effect
              <div className="space-y-0.5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center py-1.5 rounded animate-pulse"
                  >
                    <div className="w-4 h-4 bg-slate-100 rounded"></div>
                    <div className="w-6 h-1 bg-slate-100 rounded mt-0.5"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Monitor & Analyze (Dashboard on top) */}
                {sidebarConfig.monitorItems.length > 0 && (
                  <div className="space-y-1">
                    {sidebarConfig.monitorItems.map((item) => {
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
                          className={`group flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          <Icon style={{ fontSize: '1.1rem' }} className={isActive ? 'text-orange-600' : ''} />
                          <span className={`text-[10px] font-medium mt-1 leading-tight truncate w-full text-center ${
                            isActive ? 'text-orange-600' : 'text-slate-500 group-hover:text-slate-700'
                          }`}>
                            {item.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Separator */}
                {sidebarConfig.monitorItems.length > 0 && sidebarConfig.workItems.length > 0 && (
                  <div className="h-px bg-slate-200/60 mx-2" />
                )}

                {/* Work (daily execution) */}
                {sidebarConfig.workItems.length > 0 && (
                  <div className="space-y-1">
                    {sidebarConfig.workItems.map((item) => {
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
                          className={`group flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          <Icon style={{ fontSize: '1.1rem' }} className={isActive ? 'text-orange-600' : ''} />
                          <span className={`text-[10px] font-medium mt-1 leading-tight truncate w-full text-center ${
                            isActive ? 'text-orange-600' : 'text-slate-500 group-hover:text-slate-700'
                          }`}>
                            {item.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Separator */}
                {sidebarConfig.workItems.length > 0 && sidebarConfig.acquireItems.length > 0 && (
                  <div className="h-px bg-slate-200/60 mx-2" />
                )}

                {/* Acquire & Grow */}
                {sidebarConfig.acquireItems.length > 0 && (
                  <div className="space-y-1">
                    {sidebarConfig.acquireItems.map((item) => {
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
                          className={`group flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          <Icon style={{ fontSize: '1.1rem' }} className={isActive ? 'text-orange-600' : ''} />
                          <span className={`text-[10px] font-medium mt-1 leading-tight truncate w-full text-center ${
                            isActive ? 'text-orange-600' : 'text-slate-500 group-hover:text-slate-700'
                          }`}>
                            {item.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Separator */}
                {sidebarConfig.acquireItems.length > 0 && sidebarConfig.adminItems.length > 0 && (
                  <div className="h-px bg-slate-200/60 mx-2" />
                )}

                {/* Admin-only (Assignments, etc.) */}
                {sidebarConfig.adminItems.length > 0 && (
                  <div className="space-y-1">
                    {sidebarConfig.adminItems.map((item) => {
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
                          className={`group flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-purple-100 text-purple-600' 
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          <Icon style={{ fontSize: '1.1rem' }} className={isActive ? 'text-purple-600' : ''} />
                          <span className={`text-[10px] font-medium mt-1 leading-tight truncate w-full text-center ${
                            isActive ? 'text-purple-600' : 'text-slate-500 group-hover:text-slate-700'
                          }`}>
                            {item.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Bottom Section - Settings */}
          {mounted && !loading && sidebarConfig.bottomItems.length > 0 && (
            <div className="px-1.5 pb-2 pt-2 border-t border-slate-200/60">
              <div className="space-y-1">
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
                      className={`group flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'bg-orange-100 text-orange-600' 
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      <Icon style={{ fontSize: '1.1rem' }} className={isActive ? 'text-orange-600' : ''} />
                      <span className={`text-[10px] font-medium mt-1 leading-tight truncate w-full text-center ${
                        isActive ? 'text-orange-600' : 'text-slate-500 group-hover:text-slate-700'
                      }`}>
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
