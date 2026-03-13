'use server'

import { aiComplete } from '@/lib/ai/client'
import { AI_PRESETS } from '@/lib/ai/config'
import type { AiPresetName } from '@/lib/ai/types'
import { logger } from '@/lib/logger'
import { requireAuth } from '@/lib/utils/server-actions'

const TEST_PRESETS: Record<'standard' | 'lightweight', AiPresetName> = {
  standard: 'generation',
  lightweight: 'lightweight',
}

/**
 * Test OpenAI API connection for a given model tier.
 * @param tier - 'standard' (gpt-5.4) or 'lightweight' (gpt-5-mini)
 */
export async function testOpenAIConnection(tier: 'standard' | 'lightweight' = 'lightweight') {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  const presetName = TEST_PRESETS[tier]
  const preset = AI_PRESETS[presetName]

  try {
    const message = await aiComplete({
      preset: presetName,
      messages: [
        {
          role: 'user',
          content: 'Say "OpenAI API connection successful" in one sentence.',
        },
      ],
      maxTokens: 20,
    }) || 'No response'
    
    return {
      success: true,
      message,
      model: preset.model,
    }
  } catch (error) {
    logger.error('OpenAI API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

