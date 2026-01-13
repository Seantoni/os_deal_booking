import type { BookingFormData } from '../types'
import { Dropdown, Input, Textarea } from '@/components/ui'

interface NegocioStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function NegocioStep({ formData, errors, updateFormData, isFieldRequired = () => false }: NegocioStepProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Reglas de Negocio y Restricciones</h2>
        <p className="text-sm text-gray-500 mt-1">Condiciones legales y límites de la oferta.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Dropdown
          label="Impuestos"
          required={isFieldRequired('includesTaxes')}
            fullWidth
            items={[
              { value: 'Sí', label: 'Sí (Incluye impuestos)' },
              { value: 'No', label: 'No' },
              { value: 'Exento', label: 'Exento' },
            ]}
            selectedLabel={
                [
                  { value: 'Sí', label: 'Sí (Incluye impuestos)' },
                  { value: 'No', label: 'No' },
                  { value: 'Exento', label: 'Exento' },
            ].find(o => o.value === formData.includesTaxes)?.label || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('includesTaxes', value)}
          error={errors.includesTaxes}
        />

          <Dropdown
          label="Válido en Feriados"
          required={isFieldRequired('validOnHolidays')}
            fullWidth
            items={[
              { value: 'Sí', label: 'Sí' },
              { value: 'No', label: 'No' },
            ]}
            selectedLabel={
                [
                  { value: 'Sí', label: 'Sí' },
                  { value: 'No', label: 'No' },
            ].find(o => o.value === formData.validOnHolidays)?.label || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('validOnHolidays', value)}
          error={errors.validOnHolidays}
        />

          <Dropdown
          label="¿Tiene Acuerdo de Exclusividad?"
          required={isFieldRequired('hasExclusivity')}
            fullWidth
            items={[
              { value: 'No', label: 'No' },
              { value: 'Sí', label: 'Sí' },
            ]}
            selectedLabel={
                [
                  { value: 'No', label: 'No' },
                  { value: 'Sí', label: 'Sí' },
            ].find(o => o.value === formData.hasExclusivity)?.label || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('hasExclusivity', value)}
          error={errors.hasExclusivity}
          />

          <Input
          label="Fechas Blackout"
          required={isFieldRequired('blackoutDates')}
            value={formData.blackoutDates}
            onChange={(e) => updateFormData('blackoutDates', e.target.value)}
            placeholder="Fechas no válidas"
          error={errors.blackoutDates}
          />

        {formData.hasExclusivity === 'Sí' && (
          <div className="md:col-span-2 animate-fadeIn">
            <Textarea
              label="Condición"
              required={isFieldRequired('exclusivityCondition')}
              value={formData.exclusivityCondition}
              onChange={(e) => updateFormData('exclusivityCondition', e.target.value)}
              rows={2}
              placeholder="Condiciones de exclusividad"
              error={errors.exclusivityCondition}
            />
          </div>
        )}

          <Dropdown
          label="Vouchers para Regalar"
          required={isFieldRequired('giftVouchers')}
            fullWidth
            items={[
              { value: 'Sí', label: 'Sí' },
              { value: 'No', label: 'No' },
            ]}
            selectedLabel={
                [
                  { value: 'Sí', label: 'Sí' },
                  { value: 'No', label: 'No' },
            ].find(o => o.value === formData.giftVouchers)?.label || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('giftVouchers', value)}
          error={errors.giftVouchers}
        />

          <Dropdown
          label="¿Tiene otra sucursal que no es válida?"
          required={isFieldRequired('hasOtherBranches')}
            fullWidth
            items={[
              { value: 'No', label: 'No' },
              { value: 'Sí', label: 'Sí' },
            ]}
            selectedLabel={
                [
                  { value: 'No', label: 'No' },
                  { value: 'Sí', label: 'Sí' },
            ].find(o => o.value === formData.hasOtherBranches)?.label || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('hasOtherBranches', value)}
          error={errors.hasOtherBranches}
          />

        {formData.hasOtherBranches === 'Sí' && (
          <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-xl p-4 animate-fadeIn">
            <p className="text-sm text-yellow-800 font-semibold flex items-center gap-2">
              <span className="text-lg">⚠️</span> Válido exclusivamente para la sucursal mencionada
            </p>
          </div>
        )}

          <Input
          label="Vouchers por Persona"
          required={isFieldRequired('vouchersPerPerson')}
            type="number"
            value={formData.vouchersPerPerson}
            onChange={(e) => updateFormData('vouchersPerPerson', e.target.value)}
            placeholder="Límite de vouchers"
          error={errors.vouchersPerPerson}
        />

          <Input
          label="Comisión"
          required={isFieldRequired('commission')}
            value={formData.commission}
            onChange={(e) => updateFormData('commission', e.target.value)}
            placeholder="% de comisión"
          error={errors.commission}
          />
      </div>
    </div>
  )
}
