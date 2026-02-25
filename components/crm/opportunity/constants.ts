import type { OpportunityStage } from '@/types'

export const STAGES: OpportunityStage[] = [
  'iniciacion',
  'reunion',
  'propuesta_enviada',
  'won',
  'lost',
]

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  iniciacion: 'Iniciación',
  reunion: 'Reunión',
  propuesta_enviada: 'Propuesta Enviada',
  propuesta_aprobada: 'Propuesta Aprobada',
  won: 'Won',
  lost: 'Lost',
}

export const STAGE_COLORS: Record<OpportunityStage, { bg: string; text: string; border: string; hover: string; check: string }> = {
  iniciacion: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', hover: 'hover:bg-gray-100', check: 'text-gray-500' },
  reunion: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', hover: 'hover:bg-blue-100', check: 'text-blue-500' },
  propuesta_enviada: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hover: 'hover:bg-amber-100', check: 'text-amber-500' },
  propuesta_aprobada: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', hover: 'hover:bg-indigo-100', check: 'text-indigo-500' },
  won: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hover: 'hover:bg-emerald-100', check: 'text-emerald-500' },
  lost: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', hover: 'hover:bg-red-100', check: 'text-red-400' },
}
