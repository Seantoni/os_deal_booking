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
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-200/60 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 bg-blue-500 rounded flex-shrink-0">
              <AccountTreeIcon className="text-white" style={{ fontSize: 16 }} />
            </div>
            <span className="text-xs font-semibold text-blue-800 truncate">Solicitud creada</span>
            <span className="text-[10px] text-blue-600 hidden sm:inline">— Ver detalles en Pipeline</span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/pipeline')}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <AccountTreeIcon style={{ fontSize: 14 }} />
            <span className="hidden sm:inline">Ver</span> Pipeline
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-b border-emerald-200/60 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 bg-emerald-500 rounded flex-shrink-0">
            <EmojiEventsIcon className="text-white" style={{ fontSize: 16 }} />
          </div>
          <span className="text-xs font-semibold text-emerald-800">¡Ganada! 🎉</span>
          <span className="text-[10px] text-emerald-600 hidden sm:inline">— Cree una solicitud para continuar</span>
        </div>
        <button
          type="button"
          onClick={onCreateRequest}
          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors flex-shrink-0"
        >
          <AddIcon style={{ fontSize: 14 }} />
          <span className="hidden sm:inline">Crear</span> Solicitud
        </button>
      </div>
    </div>
  )
}

