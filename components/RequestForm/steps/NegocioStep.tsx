import type { BookingFormData } from '../types'
import { Dropdown, Input, Textarea } from '@/components/ui'

interface NegocioStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: any) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function NegocioStep({ formData, errors, updateFormData, isFieldRequired = () => false }: NegocioStepProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reglas de Negocio y Restricciones</h2>
        <p className="text-sm text-gray-500 mt-1">Condiciones legales y límites de la oferta.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Impuestos</span>
            {isFieldRequired('includesTaxes') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: 'Sí', label: 'Sí (Incluye impuestos)' },
              { value: 'No', label: 'No' },
              { value: 'Exento', label: 'Exento' },
            ]}
            selectedLabel={
              (
                [
                  { value: 'Sí', label: 'Sí (Incluye impuestos)' },
                  { value: 'No', label: 'No' },
                  { value: 'Exento', label: 'Exento' },
                ].find(o => o.value === formData.includesTaxes)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('includesTaxes', value)}
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Válido en Feriados</span>
            {isFieldRequired('validOnHolidays') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: 'Sí', label: 'Sí' },
              { value: 'No', label: 'No' },
            ]}
            selectedLabel={
              (
                [
                  { value: 'Sí', label: 'Sí' },
                  { value: 'No', label: 'No' },
                ].find(o => o.value === formData.validOnHolidays)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('validOnHolidays', value)}
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>¿Tiene Acuerdo de Exclusividad?</span>
            {isFieldRequired('hasExclusivity') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: 'No', label: 'No' },
              { value: 'Sí', label: 'Sí' },
            ]}
            selectedLabel={
              (
                [
                  { value: 'No', label: 'No' },
                  { value: 'Sí', label: 'Sí' },
                ].find(o => o.value === formData.hasExclusivity)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('hasExclusivity', value)}
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Fechas Blackout <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
          </label>
          <Input
            value={formData.blackoutDates}
            onChange={(e) => updateFormData('blackoutDates', e.target.value)}
            placeholder="Fechas no válidas"
          />
        </div>

        {formData.hasExclusivity === 'Sí' && (
          <div className="md:col-span-2 group animate-fadeIn">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Condición <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            </label>
            <Textarea
              value={formData.exclusivityCondition}
              onChange={(e) => updateFormData('exclusivityCondition', e.target.value)}
              rows={2}
              placeholder="Condiciones de exclusividad"
            />
          </div>
        )}

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Vouchers para Regalar</span>
            {isFieldRequired('giftVouchers') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: 'Sí', label: 'Sí' },
              { value: 'No', label: 'No' },
            ]}
            selectedLabel={
              (
                [
                  { value: 'Sí', label: 'Sí' },
                  { value: 'No', label: 'No' },
                ].find(o => o.value === formData.giftVouchers)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('giftVouchers', value)}
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>¿Tiene otra sucursal que no es válida?</span>
            {isFieldRequired('hasOtherBranches') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: 'No', label: 'No' },
              { value: 'Sí', label: 'Sí' },
            ]}
            selectedLabel={
              (
                [
                  { value: 'No', label: 'No' },
                  { value: 'Sí', label: 'Sí' },
                ].find(o => o.value === formData.hasOtherBranches)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('hasOtherBranches', value)}
          />
        </div>

        {formData.hasOtherBranches === 'Sí' && (
          <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-xl p-4 animate-fadeIn">
            <p className="text-sm text-yellow-800 font-semibold flex items-center gap-2">
              <span className="text-lg">⚠️</span> Válido exclusivamente para la sucursal mencionada
            </p>
          </div>
        )}

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Vouchers por Persona</span>
            {isFieldRequired('vouchersPerPerson') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            type="number"
            value={formData.vouchersPerPerson}
            onChange={(e) => updateFormData('vouchersPerPerson', e.target.value)}
            placeholder="Límite de vouchers"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Comisión</span>
            {isFieldRequired('commission') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Input
            value={formData.commission}
            onChange={(e) => updateFormData('commission', e.target.value)}
            placeholder="% de comisión"
          />
        </div>
      </div>
    </div>
  )
}

