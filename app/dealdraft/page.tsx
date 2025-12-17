'use client'

import Link from 'next/link'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

export default function DealDraftIndexPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <h1 className="text-4xl font-bold text-[#ea580c] mb-4">Deal Draft</h1>
        <p className="text-gray-600 mb-6">
          Para ver la vista previa de un deal, abre una solicitud de reserva y haz clic en el botón &quot;Deal Draft&quot;.
        </p>
        <Link
          href="/booking-requests"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#c2410c] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Ir a Solicitudes
        </Link>
      </div>
    </div>
  )
}
