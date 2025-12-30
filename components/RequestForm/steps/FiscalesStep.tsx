import type { BookingFormData } from '../types'
import { Dropdown, Input } from '@/components/ui'

interface FiscalesStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: any) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function FiscalesStep({ formData, errors, updateFormData, isFieldRequired = () => false }: FiscalesStepProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Datos Fiscales, Bancarios y de Ubicación</h2>
        <p className="text-sm text-gray-500 mt-1">Información para el voucher y transferencias.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Razón Social</span>
            {isFieldRequired('legalName') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.legalName}
            onChange={(e) => updateFormData('legalName', e.target.value)}
            placeholder="Razón social legal"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>RUC y DV</span>
            {isFieldRequired('rucDv') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.rucDv}
            onChange={(e) => updateFormData('rucDv', e.target.value)}
            placeholder="Identificación fiscal"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Nombre en Cuenta Bancaria</span>
            {isFieldRequired('bankAccountName') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.bankAccountName}
            onChange={(e) => updateFormData('bankAccountName', e.target.value)}
            placeholder="Nombre del titular"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Banco</span>
            {isFieldRequired('bank') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.bank}
            onChange={(e) => updateFormData('bank', e.target.value)}
            placeholder="Nombre del banco"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Número de Cuenta</span>
            {isFieldRequired('accountNumber') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.accountNumber}
            onChange={(e) => updateFormData('accountNumber', e.target.value)}
            placeholder="Número de cuenta"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Tipo de Cuenta</span>
            {isFieldRequired('accountType') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: 'Ahorros', label: 'Ahorros' },
              { value: 'Corriente', label: 'Corriente' },
            ]}
            selectedLabel={
              (
                [
                  { value: 'Ahorros', label: 'Ahorros' },
                  { value: 'Corriente', label: 'Corriente' },
                ].find(o => o.value === formData.accountType)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('accountType', value)}
          />
        </div>

        <div className="md:col-span-2 group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Dirección y Horario</span>
            {isFieldRequired('addressAndHours') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.addressAndHours}
            onChange={(e) => updateFormData('addressAndHours', e.target.value)}
            placeholder="Dirección física y horarios de atención"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Provincia</span>
            {isFieldRequired('province') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.province}
            onChange={(e) => updateFormData('province', e.target.value)}
            placeholder="Provincia"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Distrito</span>
            {isFieldRequired('district') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.district}
            onChange={(e) => updateFormData('district', e.target.value)}
            placeholder="Distrito"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Corregimiento</span>
            {isFieldRequired('corregimiento') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.corregimiento}
            onChange={(e) => updateFormData('corregimiento', e.target.value)}
            placeholder="Corregimiento"
          />
        </div>
      </div>
    </div>
  )
}

