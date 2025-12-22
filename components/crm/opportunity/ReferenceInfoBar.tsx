'use client'

import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import EventIcon from '@mui/icons-material/Event'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FlagIcon from '@mui/icons-material/Flag'
import type { Opportunity } from '@/types'
import { formatShortDate } from '@/lib/date'

interface ReferenceInfoBarProps {
  opportunity?: Opportunity | null
  responsibleId: string
  onResponsibleChange: (id: string) => void
  users: any[]
  isAdmin: boolean
  // Date values from form (for new opportunities or when dates change)
  startDate?: string | null
  closeDate?: string | null
  nextActivityDate?: string | null
}

export default function ReferenceInfoBar({
  opportunity,
  responsibleId,
  onResponsibleChange,
  users,
  isAdmin,
  startDate,
  closeDate,
  nextActivityDate,
}: ReferenceInfoBarProps) {
  // Use form values if provided, otherwise fall back to opportunity values
  const displayStartDate = startDate || opportunity?.startDate
  const displayCloseDate = closeDate || opportunity?.closeDate
  const displayNextActivityDate = nextActivityDate || opportunity?.nextActivityDate

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
        {/* Created At */}
        {opportunity ? (
          <div className="flex items-center gap-1.5">
            <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />
            <span className="font-medium text-gray-500">Created:</span>
            <span>{formatShortDate(opportunity.createdAt)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />
            <span className="font-medium text-gray-500">Created:</span>
            <span className="text-gray-400">New</span>
          </div>
        )}
        
        {/* Start Date */}
        <div className="flex items-center gap-1.5">
          <PlayArrowIcon className="text-green-500" style={{ fontSize: 14 }} />
          <span className="font-medium text-gray-500">Start:</span>
          <span className={displayStartDate ? '' : 'text-gray-400'}>{formatShortDate(displayStartDate)}</span>
        </div>
        
        {/* Close Date */}
        <div className="flex items-center gap-1.5">
          <FlagIcon className="text-blue-500" style={{ fontSize: 14 }} />
          <span className="font-medium text-gray-500">Close:</span>
          <span className={displayCloseDate ? '' : 'text-gray-400'}>{formatShortDate(displayCloseDate)}</span>
        </div>
        
        {/* Next Activity Date */}
        <div className="flex items-center gap-1.5">
          <EventIcon className="text-orange-500" style={{ fontSize: 14 }} />
          <span className="font-medium text-gray-500">Next Activity:</span>
          <span className={displayNextActivityDate ? '' : 'text-gray-400'}>{formatShortDate(displayNextActivityDate)}</span>
        </div>
        
        {/* Responsible - Editable */}
        <div className="flex items-center gap-1.5">
          <PersonOutlineIcon className="text-gray-400" style={{ fontSize: 14 }} />
          <span className="font-medium text-gray-500">Responsible:</span>
          {isAdmin ? (
            <select
              value={responsibleId}
              onChange={(e) => onResponsibleChange(e.target.value)}
              className="text-xs border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded px-2 py-0.5 bg-white shadow-sm"
            >
              <option value="">Select responsible...</option>
              {users.map((user) => (
                <option key={user.clerkId} value={user.clerkId}>
                  {user.name || user.email || user.clerkId}
                </option>
              ))}
            </select>
          ) : (
            <span>
              {responsibleId && users.length > 0
                ? (users.find(u => u.clerkId === responsibleId)?.name || users.find(u => u.clerkId === responsibleId)?.email || 'N/A')
                : 'N/A'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

