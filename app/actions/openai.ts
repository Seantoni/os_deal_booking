'use server'

import { getOpenAIClient } from '@/lib/openai'
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
    const openai = getOpenAIClient()
    
    // Simple test call to verify connection
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: 'Say "OpenAI API connection successful" in one sentence.',
        },
      ],
      max_tokens: 20,
    })

    const message = response.choices[0]?.message?.content || 'No response'
    
    return {
      success: true,
      message,
      model: response.model,
    }
  } catch (error) {
    logger.error('OpenAI API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

