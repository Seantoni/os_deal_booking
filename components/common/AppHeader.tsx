'use client'

import { UserButton } from '@clerk/nextjs'
import { ReactNode, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSidebar } from './AppClientProviders'
import MenuIcon from '@mui/icons-material/Menu'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import InboxIcon from '@mui/icons-material/Inbox'
import { getUnreadInboxCount } from '@/app/actions/inbox'
import InboxDropdown from './InboxDropdown'

interface AppHeaderProps {
  title?: string
  actions?: ReactNode
  showBackButton?: boolean // Force back button even on desktop
}

export default function AppHeader({ title = 'OS Deals Booking', actions, showBackButton = false }: AppHeaderProps) {
  const router = useRouter()
  const { isOpen, setIsOpen, isCollapsed, setIsCollapsed, isCalendarPage } = useSidebar()
  const [inboxOpen, setInboxOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const inboxRef = useRef<HTMLDivElement>(null)

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
    <header className="border-b border-gray-100 px-6 py-4 flex-shrink-0 bg-white z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {/* Mobile: Back Button (hidden on md+) */}
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 flex-shrink-0 md:hidden"
            aria-label="Go back"
          >
            <ArrowBackIcon fontSize="small" />
          </button>
          
          {/* Desktop: Hamburger Menu Button (only on calendar page) */}
          {isCalendarPage && (
          <button
            onClick={() => {
              if (!isOpen) {
                setIsOpen(true)
              } else {
                setIsCollapsed(!isCollapsed)
              }
            }}
            className="hidden md:block p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 flex-shrink-0"
            aria-label={isOpen ? (isCollapsed ? 'Expand sidebar' : 'Collapse sidebar') : 'Open sidebar'}
            title={isOpen ? (isCollapsed ? 'Expand sidebar' : 'Collapse sidebar') : 'Open sidebar'}
          >
            <MenuIcon fontSize="medium" />
          </button>
          )}
          
          {/* Title - truncate on mobile */}
          <h1 className="text-[14px] font-bold text-gray-900 truncate tracking-tight">{title}</h1>
          
          {/* Actions - hidden on mobile if no space */}
          {actions && <div className="hidden sm:block flex-shrink-0">{actions}</div>}
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Inbox button */}
          <div className="relative" ref={inboxRef}>
            <button
              onClick={() => setInboxOpen(!inboxOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              aria-label="Inbox"
              title="Inbox"
            >
              <InboxIcon fontSize="medium" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {inboxOpen && (
              <InboxDropdown onClose={() => setInboxOpen(false)} />
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile actions row - if there are actions */}
      {actions && (
        <div className="mt-2 sm:hidden">
          {actions}
        </div>
      )}
    </header>
  )
}
