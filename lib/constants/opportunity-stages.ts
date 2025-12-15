/**
 * Opportunity Stage Constants
 * Centralized constants for opportunity stage values
 */

export const OPPORTUNITY_STAGES = {
  INICIACION: 'iniciacion',
  REUNION: 'reunion',
  PROPUESTA_ENVIADA: 'propuesta_enviada',
  PROPUESTA_APROBADA: 'propuesta_aprobada',
  WON: 'won',
  LOST: 'lost',
} as const

export type OpportunityStage = typeof OPPORTUNITY_STAGES[keyof typeof OPPORTUNITY_STAGES]

/**
 * Array of all opportunity stage values (for iteration)
 */
export const OPPORTUNITY_STAGE_VALUES: OpportunityStage[] = [
  OPPORTUNITY_STAGES.INICIACION,
  OPPORTUNITY_STAGES.REUNION,
  OPPORTUNITY_STAGES.PROPUESTA_ENVIADA,
  OPPORTUNITY_STAGES.PROPUESTA_APROBADA,
  OPPORTUNITY_STAGES.WON,
  OPPORTUNITY_STAGES.LOST,
]

/**
 * Opportunity stage labels for UI display
 */
export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  [OPPORTUNITY_STAGES.INICIACION]: 'Iniciación',
  [OPPORTUNITY_STAGES.REUNION]: 'Reunión',
  [OPPORTUNITY_STAGES.PROPUESTA_ENVIADA]: 'Propuesta Enviada',
  [OPPORTUNITY_STAGES.PROPUESTA_APROBADA]: 'Propuesta Aprobada',
  [OPPORTUNITY_STAGES.WON]: 'Won',
  [OPPORTUNITY_STAGES.LOST]: 'Lost',
}

/**
 * Opportunity stage options for select dropdowns
 */
export const OPPORTUNITY_STAGE_OPTIONS = OPPORTUNITY_STAGE_VALUES.map(stage => ({
  value: stage,
  label: OPPORTUNITY_STAGE_LABELS[stage],
}))

