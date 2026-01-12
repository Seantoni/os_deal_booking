import type { BookingFormData } from '../types'
import { Dropdown, Input } from '@/components/ui'

interface FiscalesStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
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
        <Input
          label="Razón Social"
          required={isFieldRequired('legalName')}
          value={formData.legalName}
          onChange={(e) => updateFormData('legalName', e.target.value)}
          placeholder="Razón social legal"
          error={errors.legalName}
        />

        <Input
          label="RUC y DV"
          required={isFieldRequired('rucDv')}
          value={formData.rucDv}
          onChange={(e) => updateFormData('rucDv', e.target.value)}
          placeholder="Identificación fiscal"
          error={errors.rucDv}
        />

        <Input
          label="Nombre en Cuenta Bancaria"
          required={isFieldRequired('bankAccountName')}
          value={formData.bankAccountName}
          onChange={(e) => updateFormData('bankAccountName', e.target.value)}
          placeholder="Nombre del titular"
          error={errors.bankAccountName}
        />

        <Input
          label="Banco"
          required={isFieldRequired('bank')}
          value={formData.bank}
          onChange={(e) => updateFormData('bank', e.target.value)}
          placeholder="Nombre del banco"
          error={errors.bank}
        />

        <Input
          label="Número de Cuenta"
          required={isFieldRequired('accountNumber')}
          value={formData.accountNumber}
          onChange={(e) => updateFormData('accountNumber', e.target.value)}
          placeholder="Número de cuenta"
          error={errors.accountNumber}
        />

        <Dropdown
          label="Tipo de Cuenta"
          required={isFieldRequired('accountType')}
          fullWidth
          items={[
            { value: 'Ahorros', label: 'Ahorros' },
            { value: 'Corriente', label: 'Corriente' },
          ]}
          selectedLabel={
            [
              { value: 'Ahorros', label: 'Ahorros' },
              { value: 'Corriente', label: 'Corriente' },
            ].find(o => o.value === formData.accountType)?.label || 'Seleccionar...'
          }
          placeholder="Seleccionar..."
          onSelect={(value) => updateFormData('accountType', value)}
          error={errors.accountType}
        />

        <div className="md:col-span-2">
          <Input
            label="Dirección y Horario"
            required={isFieldRequired('addressAndHours')}
            value={formData.addressAndHours}
            onChange={(e) => updateFormData('addressAndHours', e.target.value)}
            placeholder="Dirección física y horarios de atención"
            error={errors.addressAndHours}
          />
        </div>

        <Input
          label="Provincia"
          required={isFieldRequired('province')}
          value={formData.province}
          onChange={(e) => updateFormData('province', e.target.value)}
          placeholder="Provincia"
          error={errors.province}
        />

        <Input
          label="Distrito"
          required={isFieldRequired('district')}
          value={formData.district}
          onChange={(e) => updateFormData('district', e.target.value)}
          placeholder="Distrito"
          error={errors.district}
        />

        <Input
          label="Corregimiento"
          required={isFieldRequired('corregimiento')}
          value={formData.corregimiento}
          onChange={(e) => updateFormData('corregimiento', e.target.value)}
          placeholder="Corregimiento"
          error={errors.corregimiento}
        />
      </div>
    </div>
  )
}
