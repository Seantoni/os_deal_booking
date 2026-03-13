import { getOpenAIClient } from '@/lib/openai'
import { AI_PRESETS } from './config'
import type { AiCallOptions } from './types'

/**
 * Centralized AI completion call. Merges preset defaults with per-call overrides.
 * Returns the raw text content from the first choice.
 */
export async function aiComplete(options: AiCallOptions): Promise<string> {
  const preset = AI_PRESETS[options.preset]
  const openai = getOpenAIClient()

  const completion = await openai.chat.completions.create({
    model: preset.model,
    messages: options.messages,
    temperature: options.temperature ?? preset.temperature,
    max_tokens: options.maxTokens ?? preset.maxTokens,
    ...(options.responseFormat ?? preset.responseFormat
      ? { response_format: options.responseFormat ?? preset.responseFormat }
      : {}),
  })

  return completion.choices[0]?.message?.content?.trim() || ''
}
