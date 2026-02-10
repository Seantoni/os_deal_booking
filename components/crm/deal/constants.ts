export const DEAL_STATUSES = [
  { id: 'pendiente_por_asignar', label: 'Pendiente por asignar' },
  { id: 'asignado', label: 'Asignado' },
  { id: 'elaboracion', label: 'Elaboración' },
  { id: 'borrador_enviado', label: 'Borrador Enviado' },
  { id: 'borrador_aprobado', label: 'Borrador Aprobado' },
] as const

export type DealStatus = typeof DEAL_STATUSES[number]['id']

export const DEAL_STATUS_LABELS: Record<string, string> = {
  pendiente_por_asignar: 'Pendiente por asignar',
  asignado: 'Asignado',
  elaboracion: 'Elaboración',
  borrador_enviado: 'Borrador Enviado',
  borrador_aprobado: 'Borrador Aprobado',
}

export const DEAL_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pendiente_por_asignar: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  asignado: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  elaboracion: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  borrador_enviado: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  borrador_aprobado: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
}
