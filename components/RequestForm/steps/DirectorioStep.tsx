import PeopleIcon from '@mui/icons-material/People'
import type { BookingFormData } from '../types'
import { Input } from '@/components/ui'

interface DirectorioStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: any) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function DirectorioStep({ formData, errors, updateFormData, isFieldRequired = () => false }: DirectorioStepProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Directorio de Responsables</h2>
        <p className="text-sm text-gray-500 mt-1">Personas de contacto para operación y aprobación.</p>
      </div>
      
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <PeopleIcon fontSize="small" />
          </div>
          A. Responsable de Canje (Operativo)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <span>Nombre</span>
              {isFieldRequired('redemptionContactName') ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
              )}
            </label>
            <Input
              value={formData.redemptionContactName}
              onChange={(e) => updateFormData('redemptionContactName', e.target.value)}
              placeholder="Nombre del encargado"
              size="sm"
            />
          </div>
          <div className="group">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <span>Email</span>
              {isFieldRequired('redemptionContactEmail') ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
              )}
            </label>
            <Input
              type="email"
              value={formData.redemptionContactEmail}
              onChange={(e) => updateFormData('redemptionContactEmail', e.target.value)}
              placeholder="email@negocio.com"
              error={errors.redemptionContactEmail}
              size="sm"
            />
          </div>
          <div className="group">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <span>Teléfono</span>
              <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
            </label>
            <Input
              type="tel"
              value={formData.redemptionContactPhone}
              onChange={(e) => updateFormData('redemptionContactPhone', e.target.value)}
              placeholder="+507"
              size="sm"
            />
          </div>
        </div>
      </div>

    </div>
  )
}

