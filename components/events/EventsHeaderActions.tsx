'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddIcon from '@mui/icons-material/Add'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import type { UserRole } from '@/types'
import NewRequestModal from '@/components/booking/NewRequestModal'

interface EventsHeaderActionsProps {
  userRole: UserRole
  onCreateEventClick?: () => void
}

export default function EventsHeaderActions({ userRole, onCreateEventClick }: EventsHeaderActionsProps) {
  const router = useRouter()
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)

  const handleCreateClick = () => {
    if (onCreateEventClick) {
      onCreateEventClick()
    } else {
      // Dispatch custom event if no callback provided
      window.dispatchEvent(new CustomEvent('openEventModal'))
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {/* New Request Button - Visible to all users */}
        <button
          onClick={() => setShowNewRequestModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        >
          <NoteAddIcon fontSize="small" />
          <span>Nueva Solicitud</span>
        </button>

      {/* Admin-only buttons */}
      {userRole === 'admin' && (
        <>
          {/* Create Event Button */}
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <AddIcon fontSize="small" />
            <span>Crear</span>
          </button>
        </>
      )}
      </div>

      {/* New Request Modal */}
      <NewRequestModal
        isOpen={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
      />
    </>
  )
}

