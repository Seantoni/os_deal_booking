'use client'

import { PRESENCE_MAX_BADGES } from '@/lib/constants'
import { useLivePresence } from '@/hooks/useLivePresence'

function getInitials(displayName: string): string {
  const parts = displayName
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export default function LiveUsersBadges() {
  const { users, onlineCount } = useLivePresence()

  if (onlineCount === 0) {
    return null
  }

  const visibleUsers = users.slice(0, PRESENCE_MAX_BADGES)
  const hiddenCount = onlineCount - visibleUsers.length

  return (
    <div className="hidden lg:flex items-center gap-2 mr-1">
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{onlineCount} en linea</span>
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((presenceUser) => {
          const title = `${presenceUser.displayName}${presenceUser.isCurrentUser ? ' (Tú)' : ''}${presenceUser.activePath ? ` - ${presenceUser.activePath}` : ''}`
          return (
            <div
              key={presenceUser.clerkId}
              className={`relative h-7 w-7 rounded-full border-2 border-white shadow-sm bg-gray-200 flex items-center justify-center ring-1 ${presenceUser.isCurrentUser ? 'ring-emerald-500' : 'ring-gray-300'}`}
              title={title}
              aria-label={title}
            >
              <span className="text-[10px] font-semibold text-gray-700">
                {getInitials(presenceUser.displayName)}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
          )
        })}

        {hiddenCount > 0 && (
          <div
            className="h-7 min-w-7 px-1 rounded-full border-2 border-white shadow-sm bg-gray-100 ring-1 ring-gray-300 flex items-center justify-center"
            title={`${hiddenCount} usuarios adicionales en linea`}
            aria-label={`${hiddenCount} usuarios adicionales en linea`}
          >
            <span className="text-[10px] font-semibold text-gray-600">+{hiddenCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}
