'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import SearchIcon from '@mui/icons-material/Search'
import InboxIcon from '@mui/icons-material/Inbox'
import TodayIcon from '@mui/icons-material/Today'
import { getUnreadInboxCount } from '@/app/actions/inbox'
import InboxDropdown from './InboxDropdown'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import LiveUsersBadges from './LiveUsersBadges'
import DailyAgendaModal from './DailyAgendaModal'
import { useSidebar } from './AppClientProviders'
import { getTodayInPanama } from '@/lib/date/timezone'

/**
 * GlobalHeader - Persistent header across all pages
 * Contains: Logo, Search trigger, Inbox, User profile
 */
export default function GlobalHeader() {
  const [inboxOpen, setInboxOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [dailyAgendaOpen, setDailyAgendaOpen] = useState(false)
  const inboxRef = useRef<HTMLDivElement>(null)
  const commandPalette = useCommandPalette()
  const { role, loading: roleLoading } = useSidebar()
  const { user, isLoaded: userLoaded } = useUser()
  const userId = user?.id || null

  const isSalesUser = role === 'sales'

  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await getUnreadInboxCount()
      if (result.success && result.data !== undefined) {
        setUnreadCount(result.data)
      }
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }, [])

  // Load unread count
  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadUnreadCount()
    }, 0)
    // Refresh every 30 seconds
    const interval = window.setInterval(() => {
      void loadUnreadCount()
    }, 30000)

    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(interval)
    }
  }, [loadUnreadCount])

  // Refresh count when inbox closes
  useEffect(() => {
    if (!inboxOpen) {
      const refreshTimer = window.setTimeout(() => {
        void loadUnreadCount()
      }, 0)
      return () => window.clearTimeout(refreshTimer)
    }
  }, [inboxOpen, loadUnreadCount])

  // Close inbox on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setInboxOpen(false)
      }
    }

    if (inboxOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [inboxOpen])

  const markDailyAgendaAsShownToday = useCallback(() => {
    if (!userId) return
    try {
      const today = getTodayInPanama()
      localStorage.setItem(`daily-agenda-last-open:${userId}`, today)
    } catch {
      // Ignore localStorage errors (private mode/quota).
    }
  }, [userId])

  // Auto-open agenda for sales users on first visit of the day (Panama timezone).
  useEffect(() => {
    if (!isSalesUser || roleLoading || !userLoaded || !userId) return

    const storageKey = `daily-agenda-last-open:${userId}`
    const today = getTodayInPanama()

    let lastOpenDate: string | null = null
    try {
      lastOpenDate = localStorage.getItem(storageKey)
    } catch {
      lastOpenDate = null
    }

    if (lastOpenDate === today) {
      return
    }

    markDailyAgendaAsShownToday()
    const autoOpenTimer = window.setTimeout(() => {
      setDailyAgendaOpen(true)
    }, 0)

    return () => {
      window.clearTimeout(autoOpenTimer)
    }
  }, [isSalesUser, roleLoading, userLoaded, userId, markDailyAgendaAsShownToday])

  const handleOpenDailyAgenda = () => {
    markDailyAgendaAsShownToday()
    setDailyAgendaOpen(true)
  }

  return (
    <>
      <header className="h-14 border-b border-gray-200 bg-white flex-shrink-0 z-50 sticky top-0">
        <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-gray-200">
            <Image src="/icon.png" alt="" fill className="object-cover" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold text-gray-900 hidden sm:block">OS Deals</span>
        </Link>

        {/* Center: Search trigger */}
        <button
          onClick={commandPalette.open}
          className="flex-1 max-w-md hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 transition-colors group"
        >
          <SearchIcon style={{ fontSize: 18 }} className="text-gray-400 group-hover:text-gray-500" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-400">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <LiveUsersBadges />

          {/* Daily agenda (sales only) */}
          {isSalesUser && (
            <>
              <button
                onClick={handleOpenDailyAgenda}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-semibold"
                aria-label="Abrir agenda diaria"
              >
                <TodayIcon style={{ fontSize: 16 }} />
                Agenda
              </button>
              <button
                onClick={handleOpenDailyAgenda}
                className="md:hidden p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-700"
                aria-label="Abrir agenda diaria"
              >
                <TodayIcon style={{ fontSize: 22 }} />
              </button>
            </>
          )}

          {/* Mobile search button */}
          <button
            onClick={commandPalette.open}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Buscar"
          >
            <SearchIcon style={{ fontSize: 22 }} />
          </button>

          {/* Inbox */}
          <div className="relative" ref={inboxRef}>
            <button
              onClick={() => setInboxOpen(!inboxOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="Bandeja de entrada"
            >
              <InboxIcon style={{ fontSize: 22 }} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {inboxOpen && (
              <InboxDropdown onClose={() => setInboxOpen(false)} />
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center">
            <UserButton 
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                }
              }}
            />
          </div>
        </div>
      </div>
      </header>

      <DailyAgendaModal
        isOpen={dailyAgendaOpen}
        onClose={() => setDailyAgendaOpen(false)}
      />
    </>
  )
}
