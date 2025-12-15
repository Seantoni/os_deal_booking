export const DEAL_STATUSES = [
  { id: 'pendiente_por_asignar', label: 'Pendiente por asignar' },
  { id: 'asignado', label: 'Asignado' },
  { id: 'elaboracion', label: 'Elaboración' },
  { id: 'imagenes', label: 'Imágenes' },
  { id: 'borrador_enviado', label: 'Borrador Enviado' },
  { id: 'borrador_aprobado', label: 'Borrador Aprobado' },
] as const

export type DealStatus = typeof DEAL_STATUSES[number]['id']

