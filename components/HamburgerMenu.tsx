'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useUserRole } from '@/hooks/useUserRole'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ListAltIcon from '@mui/icons-material/ListAlt'
import RequestPageIcon from '@mui/icons-material/RequestPage'
import SettingsIcon from '@mui/icons-material/Settings'

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { isAdmin, loading } = useUserRole()

  const navItems = [
    { name: 'Calendar', href: '/events', Icon: CalendarMonthIcon, roles: ['admin', 'sales'] },
    { name: 'Reservations List', href: '/reservations', Icon: ListAltIcon, roles: ['admin', 'sales'] },
    { name: 'Booking Requests', href: '/booking-requests', Icon: RequestPageIcon, roles: ['admin', 'sales'] },
    { name: 'Settings', href: '/settings', Icon: SettingsIcon, roles: ['admin'] },
  ]

  // Filter nav items based on role
  const filteredNavItems = loading 
    ? navItems.filter(item => item.roles.includes('sales')) // Show sales items while loading
    : navItems.filter(item => item.roles.includes(isAdmin ? 'admin' : 'sales'))

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Menu"
      >
        <div className="w-6 h-5 flex flex-col justify-between">
          <span className={`block h-0.5 bg-gray-800 transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`block h-0.5 bg-gray-800 transition-all ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block h-0.5 bg-gray-800 transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar Menu */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8 pt-12">
            <h2 className="text-xl font-bold text-gray-900">OS Deals Booking</h2>
            <p className="text-sm text-gray-600">OfertaSimple</p>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.Icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon fontSize="medium" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Profile at Bottom */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3">
                <UserButton afterSignOutUrl="/sign-in" />
                <span className="text-sm text-gray-600">Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

