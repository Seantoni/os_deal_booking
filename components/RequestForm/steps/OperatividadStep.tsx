import type { BookingFormData } from '../types'
import { Dropdown, Input, Textarea } from '@/components/ui'

interface OperatividadStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function OperatividadStep({ formData, errors, updateFormData, isFieldRequired = () => false }: OperatividadStepProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Operatividad y Pagos</h2>
        <p className="text-sm text-gray-500 mt-1">Definición de recurrencia, canje y facturación.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>Modalidad de Canje</span>
            {isFieldRequired('redemptionMode') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: 'Canje Simple', label: 'Canje Simple (Canje desde el día uno)' },
              { value: 'Canje Diferido', label: 'Canje Diferido' },
              { value: 'Otro', label: 'Otro' },
            ]}
            selectedLabel={
              (
                [
                  { value: 'Canje Simple', label: 'Canje Simple (Canje desde el día uno)' },
                  { value: 'Canje Diferido', label: 'Canje Diferido' },
                  { value: 'Otro', label: 'Otro' },
                ].find(o => o.value === formData.redemptionMode)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('redemptionMode', value)}
          />
          {errors.redemptionMode && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.redemptionMode}</p>}
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>¿Esta Oferta es recurrente?</span>
            {isFieldRequired('isRecurring') ? (
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
                ].find(o => o.value === formData.isRecurring)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('isRecurring', value)}
          />
          {errors.isRecurring && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.isRecurring}</p>}
        </div>

        {formData.isRecurring === 'Sí' && (
          <div className="md:col-span-2 group animate-fadeIn">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>Enlace de oferta a replicar</span>
              {isFieldRequired('recurringOfferLink') ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
              )}
            </label>
            <Input
              type="url"
              value={formData.recurringOfferLink}
              onChange={(e) => updateFormData('recurringOfferLink', e.target.value)}
              placeholder="https://..."
              error={errors.recurringOfferLink}
            />
          </div>
        )}

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de Pago
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: '', label: 'Seleccionar...' },
              { value: 'QR Mensual', label: 'QR Mensual' },
              { value: 'Transferencia', label: 'Transferencia' },
              { value: 'Yappy', label: 'Yappy' },
              { value: 'Otro', label: 'Otro' },
            ]}
            selectedLabel={
              [
                { value: '', label: 'Seleccionar...' },
                { value: 'QR Mensual', label: 'QR Mensual' },
                { value: 'Transferencia', label: 'Transferencia' },
                { value: 'Yappy', label: 'Yappy' },
                { value: 'Otro', label: 'Otro' },
              ].find(opt => opt.value === formData.paymentType)?.label || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('paymentType', value)}
          />
        </div>

        <div className="md:col-span-2 group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Instrucciones de Pago
          </label>
          <Textarea
            value={formData.paymentInstructions}
            onChange={(e) => updateFormData('paymentInstructions', e.target.value)}
            rows={3}
            placeholder="Detalles de pago (Ej: correos específicos para facturación)"
          />
        </div>
      </div>
    </div>
  )
}

