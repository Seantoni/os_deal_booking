'use client'

import { useRouter } from 'next/navigation'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AddIcon from '@mui/icons-material/Add'
import type { Opportunity, Business } from '@/types'

interface WonStageBannerProps {
  opportunity?: Opportunity | null
  business: Business
  hasRequest: boolean
  onCreateRequest: () => void
}

export default function WonStageBanner({
  opportunity,
  business,
  hasRequest,
  onCreateRequest,
}: WonStageBannerProps) {
  const router = useRouter()

  if (hasRequest) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <AccountTreeIcon className="text-white" style={{ fontSize: 24 }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900">Request Created</h3>
              <p className="text-xs text-blue-700 mt-0.5">View the Pipeline page to see more details on this and other pipelines</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/pipeline')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <AccountTreeIcon fontSize="small" />
            View Pipeline
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-200 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-lg">
            <EmojiEventsIcon className="text-white" style={{ fontSize: 24 }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Opportunity Won! 🎉</h3>
            <p className="text-xs text-emerald-700 mt-0.5">Create a booking request to get started</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCreateRequest}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <AddIcon fontSize="small" />
          Create Booking Request
        </button>
      </div>
    </div>
  )
}

