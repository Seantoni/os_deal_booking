/**
 * Deal Status Constants
 * Centralized constants for deal status values
 */

export const DEAL_STATUSES = {
  PENDING_ASSIGNMENT: 'pendiente_por_asignar',
  ASSIGNED: 'asignado',
  IN_PROGRESS: 'elaboracion',
  IMAGES: 'imagenes',
  DRAFT_SENT: 'borrador_enviado',
  DRAFT_APPROVED: 'borrador_aprobado',
} as const

export type DealStatus = typeof DEAL_STATUSES[keyof typeof DEAL_STATUSES]

/**
 * Array of all deal status values (for iteration)
 */
export const DEAL_STATUS_VALUES: DealStatus[] = [
  DEAL_STATUSES.PENDING_ASSIGNMENT,
  DEAL_STATUSES.ASSIGNED,
  DEAL_STATUSES.IN_PROGRESS,
  DEAL_STATUSES.IMAGES,
  DEAL_STATUSES.DRAFT_SENT,
  DEAL_STATUSES.DRAFT_APPROVED,
]

/**
 * Deal status labels for UI display
 */
export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  [DEAL_STATUSES.PENDING_ASSIGNMENT]: 'Pendiente por Asignar',
  [DEAL_STATUSES.ASSIGNED]: 'Asignado',
  [DEAL_STATUSES.IN_PROGRESS]: 'Elaboración',
  [DEAL_STATUSES.IMAGES]: 'Imágenes',
  [DEAL_STATUSES.DRAFT_SENT]: 'Borrador Enviado',
  [DEAL_STATUSES.DRAFT_APPROVED]: 'Borrador Aprobado',
}

/**
 * Deal status options for select dropdowns
 */
export const DEAL_STATUS_OPTIONS = DEAL_STATUS_VALUES.map(status => ({
  value: status,
  label: DEAL_STATUS_LABELS[status],
}))

