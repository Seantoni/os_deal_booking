'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from './SidebarContext'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'
import AssignmentIcon from '@mui/icons-material/Assignment'
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

type NavItem = {
  name: string
  href: string
  Icon: React.ElementType
}

// Primary nav items (shown in bottom bar) - max 5
const adminPrimaryNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
  { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
  { name: 'Requests', href: '/booking-requests', Icon: DescriptionIcon },
  { name: 'Deals', href: '/deals', Icon: AssignmentIcon },
]

const salesPrimaryNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
  { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
  { name: 'Requests', href: '/booking-requests', Icon: DescriptionIcon },
  { name: 'Deals', href: '/deals', Icon: AssignmentIcon },
]

const editorPrimaryNav: NavItem[] = [
  { name: 'Deals', href: '/deals', Icon: AssignmentIcon },
]

// Secondary nav items (shown in "More" menu)
const adminSecondaryNav: NavItem[] = [
  { name: 'Tasks', href: '/tasks', Icon: CheckCircleIcon },
  { name: 'Calendar', href: '/events', Icon: CalendarMonthIcon },
  { name: 'Reservations', href: '/reservations', Icon: ListAltIcon },
  { name: 'Leads', href: '/leads', Icon: PersonAddIcon },
  { name: 'Businesses', href: '/businesses', Icon: BusinessIcon },
  { name: 'Opportunities', href: '/opportunities', Icon: HandshakeIcon },
  { name: 'Intel', href: '/market-intelligence', Icon: TrendingUpIcon },
  { name: 'Settings', href: '/settings', Icon: SettingsIcon },
]

const salesSecondaryNav: NavItem[] = [
  { name: 'Tasks', href: '/tasks', Icon: CheckCircleIcon },
  { name: 'Calendar', href: '/events', Icon: CalendarMonthIcon },
  { name: 'Reservations', href: '/reservations', Icon: ListAltIcon },
  { name: 'Businesses', href: '/businesses', Icon: BusinessIcon },
  { name: 'Opportunities', href: '/opportunities', Icon: HandshakeIcon },
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
      {/* Hamburger button */}
      <div className="fixed top-4 left-4 z-40 md:hidden">
        <button
          onClick={() => setMoreMenuOpen(!moreMenuOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 shadow-lg border border-gray-200 text-gray-800 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Abrir menú"
        >
          <MenuIcon fontSize="small" />
          <span className="text-sm font-semibold">Menú</span>
        </button>
      </div>

      {/* Slide-in drawer */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl border-r border-gray-200 transform transition-transform duration-200 ease-out">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Menú</span>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Cerrar menú"
              >
                <CloseIcon fontSize="small" className="text-gray-500" />
              </button>
            </div>

            <div className="py-2 overflow-y-auto max-h-[calc(100vh-56px)]">
              <div className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase">Principal</div>
              <div className="flex flex-col px-2 space-y-1">
                {primaryNav.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  const Icon = item.Icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon fontSize="small" className={isActive ? 'text-blue-600' : 'text-gray-500'} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )
                })}
              </div>

              {secondaryNav.length > 0 && (
                <>
                  <div className="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase">Más</div>
                  <div className="flex flex-col px-2 space-y-1">
                    {secondaryNav.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                      const Icon = item.Icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon fontSize="small" className={isActive ? 'text-blue-600' : 'text-gray-500'} />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

