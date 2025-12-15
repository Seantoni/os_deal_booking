'use client'

import NotesIcon from '@mui/icons-material/Notes'

interface DescriptionSectionProps {
  notes: string
  onNotesChange: (notes: string) => void
}

export default function DescriptionSection({ notes, onNotesChange }: DescriptionSectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Description</h3>
      </div>
      <div className="p-3">
        <div className="relative">
          <div className="absolute top-1.5 left-2.5 pointer-events-none">
            <NotesIcon className="text-gray-400" style={{ fontSize: 16 }} />
          </div>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Add details about the opportunity..."
            className="block w-full pl-8 pr-3 py-1.5 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm resize-y"
          />
        </div>
      </div>
    </div>
  )
}

