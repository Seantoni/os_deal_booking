import PeopleIcon from '@mui/icons-material/People'
import type { BookingFormData } from '../types'
import { Input } from '@/components/ui'

interface DirectorioStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function DirectorioStep({ formData, errors, updateFormData, isFieldRequired = () => false }: DirectorioStepProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Directorio de Responsables</h2>
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
          <Input
            label="Nombre"
            required={isFieldRequired('redemptionContactName')}
            value={formData.redemptionContactName}
            onChange={(e) => updateFormData('redemptionContactName', e.target.value)}
            placeholder="Nombre del encargado"
            size="sm"
            error={errors.redemptionContactName}
          />
          <Input
            label="Email"
            required={isFieldRequired('redemptionContactEmail')}
            type="email"
            value={formData.redemptionContactEmail}
            onChange={(e) => updateFormData('redemptionContactEmail', e.target.value)}
            placeholder="email@negocio.com"
            error={errors.redemptionContactEmail}
            size="sm"
          />
          <Input
            label="Teléfono"
            required={isFieldRequired('redemptionContactPhone')}
            type="tel"
            value={formData.redemptionContactPhone}
            onChange={(e) => updateFormData('redemptionContactPhone', e.target.value)}
            placeholder="+507"
            size="sm"
            error={errors.redemptionContactPhone}
          />
        </div>
      </div>
    </div>
  )
}
