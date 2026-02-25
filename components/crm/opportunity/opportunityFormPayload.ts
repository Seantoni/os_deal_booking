import type { OpportunityStage } from '@/types'

export type OpportunityFormValues = Record<string, string | null | undefined>

type ResponsibleMode = 'always' | 'if_present' | 'never'

interface BuildOpportunityFormDataParams {
  values: OpportunityFormValues
  fallbackBusinessId?: string | null
  stage: OpportunityStage
  responsibleId?: string | null
  responsibleMode?: ResponsibleMode
  lostReason?: string
}

export function buildOpportunityFormData({
  values,
  fallbackBusinessId,
  stage,
  responsibleId,
  responsibleMode = 'if_present',
  lostReason,
}: BuildOpportunityFormDataParams): FormData {
  const formData = new FormData()
  formData.append('businessId', values.businessId || fallbackBusinessId || '')
  formData.append('stage', stage)
  formData.append('startDate', values.startDate || '')
  if (values.closeDate) formData.append('closeDate', values.closeDate)
  if (values.notes) formData.append('notes', values.notes)

  if (responsibleMode === 'always') {
    formData.append('responsibleId', responsibleId || '')
  } else if (responsibleMode === 'if_present' && responsibleId) {
    formData.append('responsibleId', responsibleId)
  }

  formData.append('categoryId', values.categoryId || '')
  formData.append('tier', values.tier || '')
  formData.append('contactName', values.contactName || '')
  formData.append('contactPhone', values.contactPhone || '')
  formData.append('contactEmail', values.contactEmail || '')

  if (lostReason) {
    formData.append('lostReason', lostReason)
  }

  return formData
}
