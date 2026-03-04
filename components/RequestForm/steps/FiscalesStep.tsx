import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import type { BankAccountInfo, BookingFormData } from '../types'
import { Dropdown, Input } from '@/components/ui'
import { ProvDistCorrSelect } from '@/components/shared'

interface FiscalesStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

const ACCOUNT_TYPE_ITEMS = [
  { value: '', label: 'Seleccionar...' },
  { value: 'Cuenta de Ahorros', label: 'Cuenta de Ahorros' },
  { value: 'Cuenta Corriente', label: 'Cuenta Corriente' },
]

export default function FiscalesStep({ formData, errors, updateFormData, isFieldRequired = () => false }: FiscalesStepProps) {
  const additionalBankAccounts = Array.isArray(formData.additionalBankAccounts)
    ? formData.additionalBankAccounts
    : []

  const addAdditionalBankAccount = () => {
    const nextAccounts: BankAccountInfo[] = [
      ...additionalBankAccounts,
      { bankAccountName: '', bank: '', accountNumber: '', accountType: '' },
    ]
    updateFormData('additionalBankAccounts', nextAccounts)
  }

  const removeAdditionalBankAccount = (index: number) => {
    const nextAccounts = additionalBankAccounts.filter((_, accountIndex) => accountIndex !== index)
    updateFormData('additionalBankAccounts', nextAccounts)
  }

  const updateAdditionalBankAccount = (
    index: number,
    field: keyof BankAccountInfo,
    value: string
  ) => {
    const nextAccounts = additionalBankAccounts.map((account, accountIndex) =>
      accountIndex === index ? { ...account, [field]: value } : account
    )
    updateFormData('additionalBankAccounts', nextAccounts)
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Datos Fiscales, Bancarios y de Ubicación</h2>
        <p className="text-sm text-gray-500 mt-1">Información para el voucher, transferencias y ubicación del comercio.</p>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Información Fiscal</h3>
          <p className="text-xs text-gray-500 mt-1">Datos fiscales requeridos para la facturación y documentación legal.</p>
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
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Información Bancaria</h3>
            <p className="text-xs text-gray-500 mt-1">La cuenta principal se mantiene como referencia para integraciones externas.</p>
          </div>
          <button
            type="button"
            onClick={addAdditionalBankAccount}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            <AddIcon style={{ fontSize: 18 }} />
            Agregar cuenta
          </button>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 md:p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Cuenta Principal</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              items={ACCOUNT_TYPE_ITEMS}
              value={formData.accountType}
              placeholder="Seleccionar..."
              onSelect={(value) => updateFormData('accountType', value)}
              error={errors.accountType}
            />
          </div>
        </div>

        {additionalBankAccounts.map((account, index) => (
          <div key={`additional-bank-account-${index}`} className="border border-gray-200 rounded-xl p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Cuenta Bancaria Adicional {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeAdditionalBankAccount(index)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                aria-label={`Eliminar cuenta bancaria adicional ${index + 1}`}
                title={`Eliminar cuenta bancaria adicional ${index + 1}`}
              >
                <DeleteOutlineIcon style={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input
                label="Nombre en Cuenta Bancaria"
                value={account.bankAccountName}
                onChange={(e) => updateAdditionalBankAccount(index, 'bankAccountName', e.target.value)}
                placeholder="Nombre del titular"
                error={errors[`additionalBankAccounts.${index}.bankAccountName`]}
              />

              <Input
                label="Banco"
                value={account.bank}
                onChange={(e) => updateAdditionalBankAccount(index, 'bank', e.target.value)}
                placeholder="Nombre del banco"
                error={errors[`additionalBankAccounts.${index}.bank`]}
              />

              <Input
                label="Número de Cuenta"
                value={account.accountNumber}
                onChange={(e) => updateAdditionalBankAccount(index, 'accountNumber', e.target.value)}
                placeholder="Número de cuenta"
                error={errors[`additionalBankAccounts.${index}.accountNumber`]}
              />

              <Dropdown
                label="Tipo de Cuenta"
                fullWidth
                items={ACCOUNT_TYPE_ITEMS}
                value={account.accountType}
                placeholder="Seleccionar..."
                onSelect={(value) => updateAdditionalBankAccount(index, 'accountType', value)}
                error={errors[`additionalBankAccounts.${index}.accountType`]}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Ubicación</h3>
          <p className="text-xs text-gray-500 mt-1">Datos de dirección y cobertura del negocio para referencia operativa.</p>
        </div>
        <div className="grid grid-cols-1 gap-8">
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

        <div className="md:col-span-2">
          <ProvDistCorrSelect
            label="Provincia, Distrito, Corregimiento"
            required={isFieldRequired('provinceDistrictCorregimiento')}
            value={formData.provinceDistrictCorregimiento}
            onChange={(value) => updateFormData('provinceDistrictCorregimiento', value || '')}
            placeholder="Seleccionar ubicación..."
            error={errors.provinceDistrictCorregimiento}
          />
        </div>
        </div>
      </section>
      </div>
  )
}
