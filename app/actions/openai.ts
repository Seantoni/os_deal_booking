'use server'

import { aiComplete } from '@/lib/ai/client'
import { AI_PRESETS } from '@/lib/ai/config'
import { logger } from '@/lib/logger'
import { requireAuth } from '@/lib/utils/server-actions'

/**
 * Test OpenAI API connection
 * This is a simple test to verify the API is working
 */
export async function testOpenAIConnection() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const message = await aiComplete({
      preset: 'lightweight',
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
      model: AI_PRESETS.lightweight.model,
    }
  } catch (error) {
    logger.error('OpenAI API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

