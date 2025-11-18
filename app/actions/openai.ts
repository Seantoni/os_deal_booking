'use server'

import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'

/**
 * Test OpenAI API connection
 * This is a simple test to verify the API is working
 */
export async function testOpenAIConnection() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  try {
    const openai = getOpenAIClient()
    
    // Simple test call to verify connection
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    console.error('OpenAI API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

