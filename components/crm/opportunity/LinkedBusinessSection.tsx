'use client'

import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { Business } from '@/types'

interface LinkedBusinessSectionProps {
  business: Business
  onEdit: (business: Business) => void
}

export default function LinkedBusinessSection({ business, onEdit }: LinkedBusinessSectionProps) {

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BusinessIcon className="text-blue-600" style={{ fontSize: 16 }} />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Negocio Vinculado</h3>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        <button
          type="button"
          onClick={() => onEdit(business)}
          className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
              <h4 className="font-medium text-gray-900 truncate">
                {business.name}
              </h4>
              {business.contactName && (
                <>
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <PersonIcon style={{ fontSize: 12 }} className="flex-shrink-0" />
                    <span className="truncate text-gray-500">{business.contactName}</span>
                  </div>
                </>
              )}
              {business.contactPhone && (
                <>
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <PhoneIcon style={{ fontSize: 12 }} className="flex-shrink-0" />
                    <span className="truncate text-gray-500">{business.contactPhone}</span>
                  </div>
                </>
              )}
            </div>
            <ArrowForwardIcon className="text-gray-400 group-hover:text-blue-600 flex-shrink-0 transition-colors" style={{ fontSize: 12 }} />
          </div>
        </button>
      </div>
    </div>
  )
}
