'use client'

import type { BookingSettings } from '@/lib/settings'
import ReplayCircleFilledIcon from '@mui/icons-material/ReplayCircleFilled'

interface VendorReactivationTabProps {
  settings: BookingSettings
  setSettings: (settings: BookingSettings) => void
}

export default function VendorReactivationTab({
  settings,
  setSettings,
}: VendorReactivationTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ReplayCircleFilledIcon style={{ fontSize: 18 }} className="text-amber-600" />
            Reactivaciones de Vendor
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Controla el enfriamiento antes de volver a contactar negocios para replicar deals históricos.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Días mínimos de enfriamiento
              </label>
              <p className="text-xs text-gray-600 mt-1 max-w-xl">
                Se usa para decidir si un negocio entra otra vez en reactivación. El cálculo toma la fecha
                más reciente entre la última solicitud aprobada y el último email de reactivación enviado.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={settings.vendorReactivationCooldownDays}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    vendorReactivationCooldownDays: Math.max(0, parseInt(event.target.value, 10) || 0),
                  })
                }
                className="w-24 px-3 py-2 text-sm font-semibold text-center border border-amber-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600 font-medium">días</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
