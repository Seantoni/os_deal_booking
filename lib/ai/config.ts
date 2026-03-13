import type { AiPreset, AiPresetName } from './types'

const MODEL_STANDARD = 'gpt-5.4'
const MODEL_MINI = 'gpt-5-mini'

export const AI_PRESETS: Record<AiPresetName, AiPreset> = {
  extraction: {
    model: MODEL_STANDARD,
    temperature: 0.1,
    maxTokens: 600,
  },
  classification: {
    model: MODEL_STANDARD,
    temperature: 0.1,
    maxTokens: 800,
  },
  generation: {
    model: MODEL_STANDARD,
    temperature: 0,
    maxTokens: 1000,
  },
  'generation-creative': {
    model: MODEL_STANDARD,
    temperature: 0.8,
    maxTokens: 800,
  },
  proofreading: {
    model: MODEL_STANDARD,
    temperature: 0.2,
    maxTokens: 1200,
  },
  analysis: {
    model: MODEL_STANDARD,
    temperature: 0.2,
    maxTokens: 1500,
  },
  lightweight: {
    model: MODEL_MINI,
    temperature: 0.1,
    maxTokens: 600,
  },
} as const
