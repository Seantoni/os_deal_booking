/**
 * Lead Stage Constants
 * Centralized constants for lead stage values
 */

export const LEAD_STAGES = {
  POR_ASIGNAR: 'por_asignar',
  ASIGNADO: 'asignado',
  CONVERTIDO: 'convertido',
} as const

export type LeadStage = typeof LEAD_STAGES[keyof typeof LEAD_STAGES]

/**
 * Array of all lead stage values (for iteration)
 */
export const LEAD_STAGE_VALUES: LeadStage[] = [
  LEAD_STAGES.POR_ASIGNAR,
  LEAD_STAGES.ASIGNADO,
  LEAD_STAGES.CONVERTIDO,
]

/**
 * Lead stage labels for UI display
 */
export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  [LEAD_STAGES.POR_ASIGNAR]: 'Por Asignar',
  [LEAD_STAGES.ASIGNADO]: 'Asignado',
  [LEAD_STAGES.CONVERTIDO]: 'Convertido',
}

// Also export as Record<string, string> for backward compatibility
export const LEAD_STAGE_LABELS_MAP: Record<string, string> = LEAD_STAGE_LABELS

/**
 * Lead stage options for select dropdowns
 */
export const LEAD_STAGE_OPTIONS = LEAD_STAGE_VALUES.map(stage => ({
  value: stage,
  label: LEAD_STAGE_LABELS[stage],
}))

/**
 * Lead stage colors for UI display
 */
export const LEAD_STAGE_COLORS: Record<string, string> = {
  por_asignar: 'bg-gray-100 text-gray-800',
  asignado: 'bg-blue-100 text-blue-800',
  convertido: 'bg-green-100 text-green-800',
}


