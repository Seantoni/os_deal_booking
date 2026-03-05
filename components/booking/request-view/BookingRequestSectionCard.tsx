'use client'

import type { ReactNode } from 'react'
import CommentIcon from '@mui/icons-material/Comment'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

interface BookingRequestSectionCardProps {
  title: string
  isExpanded: boolean
  commentCount: number
  onToggle: () => void
  children: ReactNode
}

export function BookingRequestSectionCard({
  title,
  isExpanded,
  commentCount,
  onToggle,
  children,
}: BookingRequestSectionCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between hover:bg-slate-50/80 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
            {title}
          </span>
          {commentCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold ring-1 ring-blue-100">
              <CommentIcon style={{ fontSize: 12 }} className="mr-1" />
              {commentCount}
            </span>
          )}
        </div>
        <div
          className={`text-slate-400 group-hover:text-blue-600 transition-colors transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        >
          <ExpandMoreIcon fontSize="small" />
        </div>
      </button>

      {isExpanded && <div className="p-6 bg-white">{children}</div>}
    </div>
  )
}
