'use client'

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import EditIcon from '@mui/icons-material/Edit'

interface LostReasonSectionProps {
  lostReason: string
  onEdit: () => void
}

export default function LostReasonSection({ lostReason, onEdit }: LostReasonSectionProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
      <div className="bg-red-100 px-4 py-2 border-b border-red-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ErrorOutlineIcon className="text-red-600" fontSize="small" />
          <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide">Lost Reason</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        >
          <EditIcon style={{ fontSize: 14 }} />
          Edit
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm text-red-900">{lostReason}</p>
      </div>
    </div>
  )
}

