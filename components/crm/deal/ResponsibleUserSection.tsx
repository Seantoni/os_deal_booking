'use client'

import { useState } from 'react'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

interface ResponsibleUserSectionProps {
  responsibleId: string
  onResponsibleChange: (id: string) => void
  ereResponsibleId: string
  onEreResponsibleChange: (id: string) => void
  editorUsers: any[]
  ereUsers: any[]
  isAdmin: boolean
}

export default function ResponsibleUserSection({
  responsibleId,
  onResponsibleChange,
  ereResponsibleId,
  onEreResponsibleChange,
  editorUsers,
  ereUsers,
  isAdmin,
}: ResponsibleUserSectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-left"
        aria-label={open ? 'Collapse section' : 'Expand section'}
      >
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Deal Responsible Users</h3>
        {open ? <ExpandLessIcon fontSize="small" className="text-gray-500" /> : <ExpandMoreIcon fontSize="small" className="text-gray-500" />}
      </button>
      {open && (
      <div className="p-3 space-y-2.5">
        {/* Editor Responsible */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
            Editor
          </label>
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <PersonOutlineIcon className="text-gray-400" style={{ fontSize: 16 }} />
            </div>
            {isAdmin ? (
              <div className="relative w-full">
                <select
                  value={responsibleId}
                  onChange={(e) => onResponsibleChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 bg-white appearance-none hover:border-gray-300 text-xs pl-8 pr-3 py-1.5"
                >
                  <option value="">Select editor...</option>
                  {editorUsers.map((user) => (
                    <option key={user.clerkId} value={user.clerkId}>
                      {user.name || user.email || user.clerkId}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="block w-full pl-8 pr-3 py-1.5 text-sm text-gray-600">
                {responsibleId && editorUsers.length > 0
                  ? (editorUsers.find(u => u.clerkId === responsibleId)?.name || editorUsers.find(u => u.clerkId === responsibleId)?.email || 'N/A')
                  : 'Unassigned'}
              </div>
            )}
          </div>
        </div>

        {/* ERE Responsible */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
            ERE
          </label>
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <PersonOutlineIcon className="text-gray-400" style={{ fontSize: 16 }} />
            </div>
            {isAdmin ? (
              <div className="relative w-full">
                <select
                  value={ereResponsibleId}
                  onChange={(e) => onEreResponsibleChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 bg-white appearance-none hover:border-gray-300 text-xs pl-8 pr-3 py-1.5"
                >
                  <option value="">Select ERE...</option>
                  {ereUsers.map((user) => (
                    <option key={user.clerkId} value={user.clerkId}>
                      {user.name || user.email || user.clerkId}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="block w-full pl-8 pr-3 py-1.5 text-sm text-gray-600">
                {ereResponsibleId && ereUsers.length > 0
                  ? (ereUsers.find(u => u.clerkId === ereResponsibleId)?.name || ereUsers.find(u => u.clerkId === ereResponsibleId)?.email || 'N/A')
                  : 'Unassigned'}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

