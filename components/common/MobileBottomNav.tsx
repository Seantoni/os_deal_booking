'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from './AppClientProviders'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ListAltIcon from '@mui/icons-material/ListAlt'
import BusinessIcon from '@mui/icons-material/Business'
import HandshakeIcon from '@mui/icons-material/Handshake'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import SettingsIcon from '@mui/icons-material/Settings'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

import MoreHorizIcon from '@mui/icons-material/MoreHoriz'

type NavItem = {
  name: string
  href: string
  Icon: React.ElementType
}

// Primary nav items (shown in bottom bar) - max 4 + More
const adminPrimaryNav: NavItem[] = [
  { name: 'Opps', href: '/opportunities', Icon: HandshakeIcon },
  { name: 'Negocios', href: '/businesses', Icon: BusinessIcon },
  { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
  { name: 'Requests', href: '/booking-requests', Icon: DescriptionIcon },
]

const salesPrimaryNav: NavItem[] = [
  { name: 'Opps', href: '/opportunities', Icon: HandshakeIcon },
  { name: 'Negocios', href: '/businesses', Icon: BusinessIcon },
  { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
  { name: 'Requests', href: '/booking-requests', Icon: DescriptionIcon },
]

const editorPrimaryNav: NavItem[] = [
  { name: 'Ofertas', href: '/deals', Icon: AssignmentIcon },
]

// Secondary nav items (shown in "More" menu)
const adminSecondaryNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
  { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
  { name: 'Marketing', href: '/marketing', Icon: AssignmentIcon },
  { name: 'Tareas', href: '/tasks', Icon: CheckCircleIcon },
  { name: 'Calendario', href: '/events', Icon: CalendarMonthIcon },
  { name: 'Reservaciones', href: '/reservations', Icon: ListAltIcon },
  { name: 'Leads', href: '/leads', Icon: PersonAddIcon },
  { name: 'Inteligencia', href: '/market-intelligence', Icon: TrendingUpIcon },
  { name: 'Asignaciones', href: '/assignments', Icon: AssignmentReturnIcon },
  { name: 'Configuración', href: '/settings', Icon: SettingsIcon },
]

const salesSecondaryNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
  { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
  { name: 'Marketing', href: '/marketing', Icon: AssignmentIcon },
  { name: 'Tareas', href: '/tasks', Icon: CheckCircleIcon },
  { name: 'Calendario', href: '/events', Icon: CalendarMonthIcon },
  { name: 'Reservaciones', href: '/reservations', Icon: ListAltIcon },
]

const editorSecondaryNav: NavItem[] = []

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { role, loading, moreMenuOpen, setMoreMenuOpen } = useSidebar()
  const [mounted, setMounted] = useState(false)

  // Track client mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const { primaryNav, secondaryNav } = useMemo(() => {
    if (loading || !role) {
      return { primaryNav: [], secondaryNav: [] }
    }

    const normalizedRole = role.toLowerCase().trim()

    switch (normalizedRole) {
      case 'admin':
        return { primaryNav: adminPrimaryNav, secondaryNav: adminSecondaryNav }
      case 'sales':
        return { primaryNav: salesPrimaryNav, secondaryNav: salesSecondaryNav }
      case 'editor':
        return { primaryNav: editorPrimaryNav, secondaryNav: editorSecondaryNav }
      default:
        return { primaryNav: [], secondaryNav: [] }
    }
  }, [role, loading])

  // Return null until mounted AND role is loaded to prevent hydration mismatch
  if (!mounted || loading || primaryNav.length === 0) return null

  const allNav = [...primaryNav, ...secondaryNav]

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden pb-safe">
        <div className="flex items-center justify-around h-16 px-1">
          {primaryNav.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.Icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreMenuOpen(false)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className={isActive ? 'text-blue-600' : 'text-gray-500'} style={{ fontSize: 24 }} />
                <span className="text-[10px] font-medium truncate max-w-[64px]">{item.name}</span>
              </Link>
            )
          })}
          
          {/* More Button */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              moreMenuOpen ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <MoreHorizIcon style={{ fontSize: 24 }} />
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </div>
      </div>

      {/* Slide-in drawer (More Menu) */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-200 ease-out flex flex-col pb-safe">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Menú</span>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Cerrar menú"
              >
                <CloseIcon fontSize="small" className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <div className="flex flex-col px-2 space-y-1">
                {secondaryNav.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  const Icon = item.Icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon fontSize="small" className={isActive ? 'text-blue-600' : 'text-gray-500'} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

