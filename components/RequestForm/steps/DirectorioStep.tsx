import PeopleIcon from '@mui/icons-material/People'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import type { BookingFormData } from '../types'
import { Button, Input } from '@/components/ui'

interface DirectorioStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function DirectorioStep({ formData, errors, updateFormData, isFieldRequired = () => false }: DirectorioStepProps) {
  const additionalContacts = Array.isArray(formData.additionalRedemptionContacts)
    ? formData.additionalRedemptionContacts
    : []

  const handleAddContact = () => {
    updateFormData('additionalRedemptionContacts', [
      ...additionalContacts,
      { name: '', email: '', phone: '' },
    ])
  }

  const handleUpdateContact = (
    index: number,
    field: 'name' | 'email' | 'phone',
    value: string
  ) => {
    updateFormData(
      'additionalRedemptionContacts',
      additionalContacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact
      )
    )
  }

  const handleRemoveContact = (index: number) => {
    updateFormData(
      'additionalRedemptionContacts',
      additionalContacts.filter((_, contactIndex) => contactIndex !== index)
    )
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Directorio de Responsables</h2>
        <p className="text-sm text-gray-500 mt-1">Personas de contacto para operación y aprobación.</p>
      </div>
      
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <PeopleIcon fontSize="small" />
            </div>
            A. Responsable de Canje (Operativo)
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<AddIcon fontSize="small" />}
            onClick={handleAddContact}
          >
            Agregar contacto
          </Button>
        </div>
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

        {additionalContacts.length > 0 && (
          <div className="mt-6 space-y-4">
            {additionalContacts.map((contact, index) => (
              <div
                key={`additional-contact-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Contacto adicional {index + 1}</p>
                    <p className="text-xs text-gray-500">Se guardará junto al contacto principal.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => handleRemoveContact(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Quitar
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    label="Nombre"
                    value={contact.name}
                    onChange={(e) => handleUpdateContact(index, 'name', e.target.value)}
                    placeholder="Nombre del encargado"
                    size="sm"
                    error={errors[`additionalRedemptionContacts.${index}.name`]}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={contact.email}
                    onChange={(e) => handleUpdateContact(index, 'email', e.target.value)}
                    placeholder="email@negocio.com"
                    size="sm"
                    error={errors[`additionalRedemptionContacts.${index}.email`]}
                  />
                  <Input
                    label="Teléfono"
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => handleUpdateContact(index, 'phone', e.target.value)}
                    placeholder="+507"
                    size="sm"
                    error={errors[`additionalRedemptionContacts.${index}.phone`]}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
