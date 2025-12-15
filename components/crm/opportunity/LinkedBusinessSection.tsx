'use client'

import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { Business } from '@/types'

interface LinkedBusinessSectionProps {
  business: Business
  onEdit: (business: Business) => void
}

export default function LinkedBusinessSection({ business, onEdit }: LinkedBusinessSectionProps) {
  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BusinessIcon className="text-blue-600" fontSize="small" />
          <h3 className="text-sm font-bold text-gray-700">Linked Business</h3>
        </div>
      </div>
      
      <div className="p-4">
        <button
          type="button"
          onClick={() => onEdit(business)}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 mb-1.5">
                {business.name}
              </h4>
              <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <PersonIcon fontSize="small" />
                  <span>{business.contactName}</span>
                </div>
                {business.contactPhone && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <PhoneIcon fontSize="small" />
                      <span>{business.contactPhone}</span>
                    </div>
                  </>
                )}
                {business.contactEmail && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <EmailIcon fontSize="small" />
                      <span className="truncate">{business.contactEmail}</span>
                    </div>
                  </>
                )}
              </div>
              {business.category && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {business.category.parentCategory}
                    {business.category.subCategory1 && ` > ${business.category.subCategory1}`}
                    {business.category.subCategory2 && ` > ${business.category.subCategory2}`}
                  </span>
                  {business.tier && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      Tier {business.tier}
                    </span>
                  )}
                </div>
              )}
              {business.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{business.description}</p>
              )}
            </div>
            <ArrowForwardIcon className="text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" fontSize="small" />
          </div>
        </button>
      </div>
    </div>
  )
}

