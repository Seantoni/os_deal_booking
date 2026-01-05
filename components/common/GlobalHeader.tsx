'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import SearchIcon from '@mui/icons-material/Search'
import InboxIcon from '@mui/icons-material/Inbox'
import { getUnreadInboxCount } from '@/app/actions/inbox'
import InboxDropdown from './InboxDropdown'
import { useCommandPalette } from '@/hooks/useCommandPalette'

/**
 * GlobalHeader - Persistent header across all pages
 * Contains: Logo, Search trigger, Inbox, User profile
 */
export default function GlobalHeader() {
  const [inboxOpen, setInboxOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const inboxRef = useRef<HTMLDivElement>(null)
  const commandPalette = useCommandPalette()

  // Load unread count
  useEffect(() => {
    loadUnreadCount()
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh count when inbox closes
  useEffect(() => {
    if (!inboxOpen) {
      loadUnreadCount()
    }
  }, [inboxOpen])

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

  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadInboxCount()
      if (result.success && result.data !== undefined) {
        setUnreadCount(result.data)
      }
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex-shrink-0 z-50 sticky top-0">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-gray-200">
            <Image src="/icon.png" alt="OS Deals" fill className="object-cover" />
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
  )
}

