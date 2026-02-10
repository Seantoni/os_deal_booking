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
import CampaignIcon from '@mui/icons-material/Campaign'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'

type NavItem = {
  name: string
  href: string
  Icon: React.ElementType
}

type NavSection = {
  label: string
  items: NavItem[]
}

// Primary nav items (shown in bottom bar): Business - Opps - Requests - Calendar
const adminPrimaryNav: NavItem[] = [
  { name: 'Negocios', href: '/businesses', Icon: BusinessIcon },
  { name: 'Opps', href: '/opportunities', Icon: HandshakeIcon },
  { name: 'Requests', href: '/booking-requests', Icon: DescriptionIcon },
  { name: 'Calendario', href: '/events', Icon: CalendarMonthIcon },
]

const salesPrimaryNav: NavItem[] = [
  { name: 'Negocios', href: '/businesses', Icon: BusinessIcon },
  { name: 'Opps', href: '/opportunities', Icon: HandshakeIcon },
  { name: 'Requests', href: '/booking-requests', Icon: DescriptionIcon },
  { name: 'Calendario', href: '/events', Icon: CalendarMonthIcon },
]

const editorPrimaryNav: NavItem[] = []

// Secondary nav items (shown in "More" menu) — organized by sections
const adminSecondarySections: NavSection[] = [
  {
    label: 'Monitoreo',
    items: [
      { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
      { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { name: 'Tareas', href: '/tasks', Icon: CheckCircleIcon },
      { name: 'Campañas', href: '/campaigns', Icon: CampaignIcon },
      { name: 'Marketing', href: '/marketing', Icon: AssignmentIcon },
      { name: 'Reservaciones', href: '/reservations', Icon: ListAltIcon },
    ],
  },
  {
    label: 'Adquisición',
    items: [
      { name: 'Leads', href: '/leads', Icon: PersonAddIcon },
      { name: 'Asignaciones', href: '/assignments', Icon: AssignmentReturnIcon },
    ],
  },
  {
    label: '',
    items: [
      { name: 'Configuración', href: '/settings', Icon: SettingsIcon },
    ],
  },
]

const salesSecondarySections: NavSection[] = [
  {
    label: 'Monitoreo',
    items: [
      { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
      { name: 'Pipeline', href: '/pipeline', Icon: AccountTreeIcon },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { name: 'Tareas', href: '/tasks', Icon: CheckCircleIcon },
      { name: 'Campañas', href: '/campaigns', Icon: CampaignIcon },
      { name: 'Marketing', href: '/marketing', Icon: AssignmentIcon },
      { name: 'Reservaciones', href: '/reservations', Icon: ListAltIcon },
    ],
  },
]

const editorSecondarySections: NavSection[] = []

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { role, loading, moreMenuOpen, setMoreMenuOpen } = useSidebar()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { primaryNav, secondarySections } = useMemo(() => {
    if (loading || !role) {
      return { primaryNav: [], secondarySections: [] }
    }

    const normalizedRole = role.toLowerCase().trim()

    switch (normalizedRole) {
      case 'admin':
        return { primaryNav: adminPrimaryNav, secondarySections: adminSecondarySections }
      case 'sales':
        return { primaryNav: salesPrimaryNav, secondarySections: salesSecondarySections }
      case 'editor':
      case 'editor_senior':
        return { primaryNav: editorPrimaryNav, secondarySections: editorSecondarySections }
      default:
        return { primaryNav: [], secondarySections: [] }
    }
  }, [role, loading])

  // Check if current path matches any secondary nav item (to highlight "Más")
  const isOnSecondaryPage = useMemo(() => {
    const allSecondaryHrefs = secondarySections.flatMap(s => s.items.map(i => i.href))
    return allSecondaryHrefs.some(href => pathname === href || pathname?.startsWith(href + '/'))
  }, [pathname, secondarySections])

  if (!mounted || loading || primaryNav.length === 0) return null

  return (
    <>
      {/* Bottom Navigation Bar — floating pill, no background behind it */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
        <div className="mx-4 mb-2 rounded-[22px] bg-white/75 backdrop-blur-2xl shadow-[0_0_0_0.5px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.1),0_12px_32px_rgba(0,0,0,0.08)] pointer-events-auto">
          <div className="flex items-center justify-around h-[56px] px-1.5">
            {primaryNav.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.Icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex flex-col items-center justify-center flex-1 h-full"
                >
                  {/* Icon — with pill behind when active */}
                  <div className={`flex items-center justify-center w-9 h-[26px] rounded-full transition-all duration-200 ${
                    isActive ? 'bg-blue-100' : ''
                  }`}>
                    <Icon
                      style={{ fontSize: 22 }}
                      className={`transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                    />
                  </div>
                  {/* Label */}
                  <span className={`text-[10px] mt-0.5 leading-none transition-colors duration-200 ${
                    isActive ? 'text-blue-600 font-semibold' : 'text-gray-400 font-medium'
                  }`}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
            
            {/* More Button */}
            <button
              onClick={() => setMoreMenuOpen(true)}
              className="flex flex-col items-center justify-center flex-1 h-full"
            >
              <div className={`flex items-center justify-center w-9 h-[26px] rounded-full transition-all duration-200 ${
                moreMenuOpen || isOnSecondaryPage ? 'bg-blue-100' : ''
              }`}>
                <MoreHorizIcon
                  style={{ fontSize: 22 }}
                  className={`transition-colors duration-200 ${moreMenuOpen || isOnSecondaryPage ? 'text-blue-600' : 'text-gray-400'}`}
                />
              </div>
              <span className={`text-[10px] mt-0.5 leading-none transition-colors duration-200 ${
                moreMenuOpen || isOnSecondaryPage ? 'text-blue-600 font-semibold' : 'text-gray-400 font-medium'
              }`}>
                Más
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in drawer (More Menu) */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]"
            onClick={() => setMoreMenuOpen(false)}
          />
          {/* Drawer panel — slides in from right */}
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-white shadow-[−16px_0_48px_rgba(0,0,0,0.12)] animate-[slideInRight_200ms_ease-out] flex flex-col pb-safe">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Menú</span>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Cerrar menú"
              >
                <CloseIcon style={{ fontSize: 18 }} className="text-gray-400" />
              </button>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto py-3">
              {secondarySections.map((section, sIdx) => (
                <div key={sIdx} className={sIdx > 0 ? 'mt-2' : ''}>
                  {/* Section label */}
                  {section.label && (
                    <div className="px-5 pb-1.5 pt-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{section.label}</span>
                    </div>
                  )}
                  {/* Section items */}
                  <div className="px-2.5">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                      const Icon = item.Icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                          }`}
                        >
                          <Icon style={{ fontSize: 18 }} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                  {/* Divider between sections */}
                  {sIdx < secondarySections.length - 1 && section.label && (
                    <div className="mx-5 mt-2 h-px bg-gray-100" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
