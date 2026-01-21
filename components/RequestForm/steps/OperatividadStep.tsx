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
          <Dropdown
          label="Modalidad de Canje"
          required={isFieldRequired('redemptionMode')}
            fullWidth
            items={[
              { value: 'Canje Simple', label: 'Canje Simple (Canje desde el día uno)' },
              { value: 'Canje Diferido', label: 'Canje Diferido' },
              { value: 'Evento', label: 'Evento' },
              { value: 'Otro', label: 'Otro' },
            ]}
            value={formData.redemptionMode}
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('redemptionMode', value)}
          error={errors.redemptionMode}
        />

          <Dropdown
          label="¿Esta Oferta es recurrente?"
          required={isFieldRequired('isRecurring')}
            fullWidth
            items={[
              { value: 'No', label: 'No' },
              { value: 'Sí', label: 'Sí' },
            ]}
            value={formData.isRecurring}
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('isRecurring', value)}
          error={errors.isRecurring}
          />

        {formData.isRecurring === 'Sí' && (
          <div className="md:col-span-2 animate-fadeIn">
            <Input
              label="Enlace de oferta a replicar"
              required={isFieldRequired('recurringOfferLink')}
              type="url"
              value={formData.recurringOfferLink}
              onChange={(e) => updateFormData('recurringOfferLink', e.target.value)}
              placeholder="https://..."
              error={errors.recurringOfferLink}
            />
          </div>
        )}

          <Dropdown
          label="Tipo de Pago"
          required={isFieldRequired('paymentType')}
            fullWidth
            items={[
              { value: '', label: 'Seleccionar...' },
              { value: 'QR Diario', label: 'QR Diario' },
              { value: 'QR Semanal', label: 'QR Semanal' },
              { value: 'QR Mensual', label: 'QR Mensual' },
              { value: 'LISTA Semanal', label: 'LISTA Semanal' },
              { value: 'LISTA Mensual', label: 'LISTA Mensual' },
              { value: '50% en 7 días y 50% en 30 días', label: '50% en 7 días y 50% en 30 días' },
              { value: 'EVENTO', label: 'EVENTO' },
              { value: 'OTRO', label: 'OTRO' },
            ]}
            value={formData.paymentType}
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('paymentType', value)}
          error={errors.paymentType}
          />

        <div className="md:col-span-2">
          <Textarea
            label="Instrucciones de Pago"
            required={isFieldRequired('paymentInstructions')}
            value={formData.paymentInstructions}
            onChange={(e) => updateFormData('paymentInstructions', e.target.value)}
            rows={3}
            placeholder="Detalles de pago (Ej: correos específicos para facturación)"
            error={errors.paymentInstructions}
          />
        </div>
      </div>
    </div>
  )
}
