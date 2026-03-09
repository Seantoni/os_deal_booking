export type AdditionalRedemptionContact = {
  name: string
  email: string
  phone: string
}

export function normalizeAdditionalRedemptionContacts(value: unknown): AdditionalRedemptionContact[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      name: String(item.name || '').trim(),
      email: String(item.email || '').trim(),
      phone: String(item.phone || '').trim(),
    }))
    .filter((item) => item.name.length > 0 || item.email.length > 0 || item.phone.length > 0)
}
