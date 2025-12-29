'use client'

import { UserButton } from '@clerk/nextjs'
import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSidebar } from './AppClientProviders'
import MenuIcon from '@mui/icons-material/Menu'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

interface AppHeaderProps {
  title?: string
  actions?: ReactNode
  showBackButton?: boolean // Force back button even on desktop
}

export default function AppHeader({ title = 'OS Deals Booking', actions, showBackButton = false }: AppHeaderProps) {
  const router = useRouter()
  const { isOpen, setIsOpen, isCollapsed, setIsCollapsed, isCalendarPage } = useSidebar()
  
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
        
        {/* User button - visible on desktop, hidden on mobile (shown in sidebar) */}
        <div className="hidden md:block">
          {/* User button is now in sidebar, but we can keep it here or remove it. 
              The sidebar design has it at the bottom. 
              Let's keep it here for now as a fallback or remove if redundant.
              Actually, the user asked for a specific design for sidebar, but header usually has user profile too.
              But the new sidebar design HAS user profile. 
              Let's hide it here to avoid duplication if it's in sidebar.
          */}
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
